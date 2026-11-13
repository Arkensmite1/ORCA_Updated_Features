# Regression tests for offline_safety router: safety-data, forecast, tiles proxy, SOS store-and-forward dedupe
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


@pytest.fixture
def s():
    return requests.Session()


# Safety data bundle
def test_safety_data(s):
    r = s.get(f"{BASE_URL}/api/offline/safety-data", timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert len(d["harbors"]) == 4 and len(d["hazards"]) == 3 and len(d["restricted"]) == 1
    assert len(d["restricted"][0]["polygon"]) >= 3
    assert d["coastline"] and d["route"]["points"] and d["bbox"]["south"] < d["bbox"]["north"]
    assert d["verified"] is False and "_id" not in d


# Marine forecast (Open-Meteo)
def test_forecast_ok(s):
    r = s.get(f"{BASE_URL}/api/forecast/marine", params={"lat": 16.99, "lng": 73.22}, timeout=40)
    assert r.status_code == 200, r.text
    d = r.json()
    assert len(d["hours"]) == 72
    h = d["hours"][0]
    for k in ("wind_kmh", "gust_kmh", "wave_m"):
        assert k in h
    assert d["fetched_at"] and d["valid_until"]


def test_forecast_invalid(s):
    assert s.get(f"{BASE_URL}/api/forecast/marine", params={"lat": 91, "lng": 73}, timeout=20).status_code == 422


# Tile proxy
def test_tile_street(s):
    r = s.get(f"{BASE_URL}/api/tiles/street/13/5763/3703", timeout=30)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/jpeg") and len(r.content) > 1000


def test_tile_osm_removed(s):
    # OSM provider removed (403 Access blocked bug)
    assert s.get(f"{BASE_URL}/api/tiles/osm/11/1440/931", timeout=30).status_code == 404


def test_tile_seamark(s):
    r = s.get(f"{BASE_URL}/api/tiles/seamark/11/1440/931", timeout=30)
    assert r.status_code in (200, 204)


def test_tile_unknown_layer(s):
    assert s.get(f"{BASE_URL}/api/tiles/foo/11/1440/931", timeout=20).status_code == 404


def test_tile_bad_zoom(s):
    assert s.get(f"{BASE_URL}/api/tiles/street/20/1/1", timeout=20).status_code == 404


# SOS transmit + dedupe + ack
def _packet(eid):
    return {"emergency_id": eid, "vessel_id": "TEST_VESSEL", "vessel_name": "TEST_boat", "type": "TEST_SOS",
            "people": 2, "lat": 16.985, "lng": 73.25, "captured_at": "2026-01-10T10:00:00Z", "details": "TEST_ pytest"}


def test_sos_transmit_dedupe(s):
    eid = str(uuid.uuid4())
    r1 = s.post(f"{BASE_URL}/api/sos/transmit", json=_packet(eid), timeout=20)
    assert r1.status_code == 200
    a = r1.json()
    assert a["status"] == "ACKNOWLEDGED" and a["duplicate"] is False and a["attempts_seen"] == 1
    assert a["ack_id"] == "ACK-" + eid[:8].upper()
    r2 = s.post(f"{BASE_URL}/api/sos/transmit", json={**_packet(eid), "attempt": 2}, timeout=20)
    b = r2.json()
    assert b["duplicate"] is True and b["attempts_seen"] == 2 and b["ack_id"] == a["ack_id"]
    inbox = s.get(f"{BASE_URL}/api/sos/inbox", timeout=20).json()
    assert len([x for x in inbox if x["emergency_id"] == eid]) == 1
    ack = s.get(f"{BASE_URL}/api/sos/{eid}/ack", timeout=20)
    assert ack.status_code == 200 and ack.json()["attempts_seen"] == 2


def test_sos_bad_id(s):
    assert s.post(f"{BASE_URL}/api/sos/transmit", json=_packet("x"), timeout=20).status_code == 422


def test_sos_missing_vessel(s):
    p = _packet(str(uuid.uuid4())); p.pop("vessel_id")
    assert s.post(f"{BASE_URL}/api/sos/transmit", json=p, timeout=20).status_code == 422


def test_sos_ack_unknown(s):
    assert s.get(f"{BASE_URL}/api/sos/{uuid.uuid4()}/ack", timeout=20).status_code == 404

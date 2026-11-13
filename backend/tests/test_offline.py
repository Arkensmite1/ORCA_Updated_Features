"""Regression coverage for offline cache, snapshot, and queued SOS APIs."""
import os
import uuid

import pytest
import requests


BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


def test_health_and_snapshot_have_expected_shape():
    health = requests.get(f"{BASE_URL}/api/health", timeout=15)
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    snapshot = requests.get(f"{BASE_URL}/api/offline/snapshot", timeout=15)
    assert snapshot.status_code == 200
    body = snapshot.json()
    assert body["freshness"] in {"CACHED", "NOT_CACHED"}
    assert "source_note" in body and "DEMO" in body["source_note"].upper()
    assert "_id" not in body


def test_cache_updates_snapshot_without_mongo_id():
    area = f"TEST_{uuid.uuid4().hex[:8]} coast"
    layers = ["Coastline", "Forecast"]
    cached = requests.post(
        f"{BASE_URL}/api/offline/cache",
        json={"area": area, "layers": layers},
        timeout=15,
    )
    assert cached.status_code == 200
    assert cached.json()["area"] == area
    assert cached.json()["layers"] == layers
    assert "_id" not in cached.json()

    snapshot = requests.get(f"{BASE_URL}/api/offline/snapshot", timeout=15)
    assert snapshot.status_code == 200
    assert snapshot.json()["freshness"] == "CACHED"
    assert snapshot.json()["layers"] == layers
    assert "_id" not in snapshot.json()


def test_queue_sos_persists_position_acknowledgement_and_retry_state():
    payload = {
        "type": "TEST offline check",
        "people": 2,
        "lat": 16.994,
        "lng": 73.265,
        "vessel": "TEST vessel",
        "details": "TEST regression item",
    }
    created = requests.post(f"{BASE_URL}/api/offline/sos-queue", json=payload, timeout=15)
    assert created.status_code == 200
    item = created.json()
    assert item["type"] == payload["type"]
    assert item["position"] == {"lat": payload["lat"], "lng": payload["lng"]}
    assert item["status"] == "QUEUED_OFFLINE"
    assert "cannot guarantee delivery" in item["acknowledgement"]
    assert "created_at" in item and "_id" not in item

    queue = requests.get(f"{BASE_URL}/api/offline/sos-queue", timeout=15)
    assert queue.status_code == 200
    persisted = next(entry for entry in queue.json() if entry["id"] == item["id"])
    assert persisted["vessel"] == payload["vessel"]

    retry = requests.post(f"{BASE_URL}/api/offline/sos-queue/{item['id']}/retry", timeout=15)
    assert retry.status_code == 200
    assert retry.json()["status"] == "RETRY_PENDING"
    assert "_id" not in retry.json()


def test_existing_emergency_sos_remains_reachable_and_clean():
    response = requests.post(
        f"{BASE_URL}/api/emergency/sos",
        json={"type": "TEST engine failure", "people": 1, "scenario": "RED"},
        timeout=15,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "HELP_REQUESTED"
    assert body["id"]
    assert "_id" not in body
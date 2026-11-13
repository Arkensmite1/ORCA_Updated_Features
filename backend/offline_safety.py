import asyncio
import re
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

UA = {"User-Agent": "ORCA-marine-safety/1.0 (offline pre-trip cache)"}
TILE_SOURCES = {
    "street": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    "seamark": "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
}
UUID_RE = re.compile(r"^[0-9a-fA-F-]{16,64}$")

SAMPLE_NOTE = "UNVERIFIED SAMPLE DATA — not an official chart. Replace with Coast Guard / hydrographic sources before relying on it."

SAFETY_DATA = {
    "version": "ratnagiri-sample-2026.06",
    "verified": False,
    "note": SAMPLE_NOTE,
    "area": "Ratnagiri coast",
    "bbox": {"south": 16.78, "west": 73.05, "north": 17.32, "east": 73.40},
    "center": [16.99, 73.22],
    "harbors": [
        {"id": "mirkarwada", "name": "Mirkarwada Fishing Harbour", "lat": 16.9925, "lng": 73.2780, "type": "Fishing harbour"},
        {"id": "ganpatipule", "name": "Ganpatipule shelter", "lat": 17.1450, "lng": 73.2650, "type": "Anchorage"},
        {"id": "jaigad", "name": "Jaigad Harbour", "lat": 17.2930, "lng": 73.2200, "type": "Port"},
        {"id": "purnagad", "name": "Purnagad creek", "lat": 16.8050, "lng": 73.3080, "type": "Creek shelter"},
    ],
    "hazards": [
        {"id": "hz-rocks", "name": "Submerged rocks / rough water", "lat": 17.045, "lng": 73.150, "radius_km": 1.2},
        {"id": "hz-shoal", "name": "Shoal off Bhatye", "lat": 16.960, "lng": 73.262, "radius_km": 0.8},
        {"id": "hz-nets", "name": "Fixed net field", "lat": 17.080, "lng": 73.240, "radius_km": 1.0},
    ],
    "restricted": [
        {"id": "rz-1", "name": "Restricted maritime zone (sample)",
         "polygon": [[17.13, 73.05], [17.20, 73.14], [17.10, 73.20], [17.02, 73.10]]},
    ],
    "coastline": [[17.30, 73.22], [17.20, 73.25], [17.145, 73.265], [17.06, 73.28], [17.00, 73.28],
                  [16.96, 73.29], [16.90, 73.30], [16.80, 73.31]],
    "route": {"id": "plan-zone-b", "name": "Mirkarwada → Fishing Zone B",
              "points": [[16.9925, 73.2780], [16.980, 73.240], [16.965, 73.185]]},
}


class SosPacket(BaseModel):
    emergency_id: str
    vessel_id: str = Field(min_length=3, max_length=64)
    vessel_name: str = "Unknown vessel"
    type: str = "Emergency"
    people: int = Field(default=1, ge=0, le=500)
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)
    accuracy_m: Optional[float] = None
    position_fixed_at: Optional[str] = None
    captured_at: str
    details: str = ""
    attempt: int = 1


def build_router(db, now_iso) -> APIRouter:
    r = APIRouter(prefix="/api")
    http = httpx.AsyncClient(timeout=12.0, headers=UA)

    @r.get("/offline/safety-data")
    async def safety_data():
        return {**SAFETY_DATA, "served_at": now_iso()}

    @r.get("/tiles/{layer}/{z}/{x}/{y}")
    async def tile(layer: str, z: int, x: int, y: int):
        if layer not in TILE_SOURCES or not (0 <= z <= 16):
            raise HTTPException(404, "unknown tile layer")
        try:
            res = await http.get(TILE_SOURCES[layer].format(z=z, x=x, y=y))
        except httpx.HTTPError:
            raise HTTPException(502, "tile provider unavailable")
        if res.status_code == 404:
            return Response(status_code=204)
        ctype = res.headers.get("content-type", "")
        if res.status_code != 200 or not ctype.startswith("image/"):
            raise HTTPException(502, "tile provider error")
        return Response(res.content, media_type=ctype, headers={"Cache-Control": "public, max-age=604800"})

    @r.get("/forecast/marine")
    async def marine_forecast(lat: float = Query(..., ge=-90, le=90), lng: float = Query(..., ge=-180, le=180)):
        common = {"latitude": lat, "longitude": lng, "forecast_hours": 72, "timezone": "UTC", "timeformat": "unixtime"}
        try:
            wx, sea = await asyncio.gather(
                http.get("https://api.open-meteo.com/v1/forecast", params={
                    **common, "hourly": "wind_speed_10m,wind_gusts_10m,wind_direction_10m", "wind_speed_unit": "kmh"}),
                http.get("https://marine-api.open-meteo.com/v1/marine", params={
                    **common, "hourly": "wave_height,swell_wave_height,wave_period", "cell_selection": "sea"}),
            )
            wx.raise_for_status(); sea.raise_for_status()
            w, m = wx.json()["hourly"], sea.json()["hourly"]
        except (httpx.HTTPError, ValueError, KeyError):
            raise HTTPException(502, "Weather provider unavailable")
        waves = dict(zip(m["time"], zip(m["wave_height"], m["swell_wave_height"], m["wave_period"])))
        hours = []
        for i, t in enumerate(w["time"]):
            wave, swell, period = waves.get(t, (None, None, None))
            hours.append({"t": t, "wind_kmh": w["wind_speed_10m"][i], "gust_kmh": w["wind_gusts_10m"][i],
                          "wind_dir": w["wind_direction_10m"][i], "wave_m": wave, "swell_m": swell, "period_s": period})
        return {"lat": lat, "lng": lng, "fetched_at": now_iso(), "source": "Open-Meteo (open-meteo.com, CC BY 4.0)",
                "valid_from": hours[0]["t"] if hours else None, "valid_until": hours[-1]["t"] if hours else None,
                "hours": hours}

    @r.post("/sos/transmit")
    async def transmit_sos(body: SosPacket):
        if not UUID_RE.match(body.emergency_id):
            raise HTTPException(422, "invalid emergency_id")
        received = now_iso()
        doc = {**body.model_dump(), "received_at": received, "ack_id": "ACK-" + body.emergency_id[:8].upper(),
               "attempts_seen": 1, "last_attempt_at": received}
        try:
            await db.sos_inbox.insert_one(dict(doc))
            duplicate = False
        except DuplicateKeyError:
            await db.sos_inbox.update_one({"emergency_id": body.emergency_id},
                                          {"$inc": {"attempts_seen": 1}, "$set": {"last_attempt_at": received}})
            duplicate = True
        saved = await db.sos_inbox.find_one({"emergency_id": body.emergency_id}, {"_id": 0})
        return {"emergency_id": saved["emergency_id"], "ack_id": saved["ack_id"], "status": "ACKNOWLEDGED",
                "received_at": saved["received_at"], "duplicate": duplicate, "attempts_seen": saved["attempts_seen"],
                "note": "Received by the ORCA server. This is not confirmation from Coast Guard or rescue services."}

    @r.get("/sos/inbox")
    async def sos_inbox():
        return await db.sos_inbox.find({}, {"_id": 0}).sort("received_at", -1).to_list(100)

    @r.get("/sos/{emergency_id}/ack")
    async def sos_ack(emergency_id: str):
        saved = await db.sos_inbox.find_one({"emergency_id": emergency_id}, {"_id": 0})
        if not saved:
            raise HTTPException(404, "not received")
        return {"emergency_id": emergency_id, "ack_id": saved["ack_id"], "status": "ACKNOWLEDGED",
                "received_at": saved["received_at"], "attempts_seen": saved["attempts_seen"]}

    @r.on_event("startup")
    async def _indexes():
        await db.sos_inbox.create_index("emergency_id", unique=True)

    @r.on_event("shutdown")
    async def _close():
        await http.aclose()

    return r


def utc_now() -> datetime:
    return datetime.now(timezone.utc)

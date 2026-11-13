# ORCA — Marine Intelligence with Offline Safety Mode

ORCA is a React + FastAPI + MongoDB marine intelligence app with a three-layer offline safety mode.

## Offline safety layers
1. **Pre-trip caching** – maps, coordinates and weather/forecast snapshots saved before departure (`GET /api/cache/snapshot`).
2. **On-device positioning & safety** – GPS tracking, route-deviation alerts and geofencing that run in the browser without a server.
3. **Emergency communication & recovery** – store-and-forward SOS queue with offline retry, synced on reconnect (`POST /api/sos/queue`).

> **Demo notice:** Satellite delivery acknowledgements, chart providers and forecast layers are **DEMO FALLBACK / SIMULATION**. SOS queue persistence is real, but actual delivery requires a supported satellite/VHF-DSC link.

## Project structure
```
backend/    FastAPI API (server.py, requirements.txt)
frontend/   React app (Tailwind, shadcn/ui, Leaflet)
tests/      Backend tests
docs/       Design guidelines, plan and test reports
```

## Setup
### Backend
```bash
cd backend
cp .env.example .env        # set MONGO_URL and DB_NAME
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend
cp .env.example .env        # set REACT_APP_BACKEND_URL
yarn install
yarn start
```

All backend routes are prefixed with `/api`.

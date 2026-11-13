# ORCA Offline Safety Upgrade

## What it is
ORCA will become an offline-first marine safety companion for fishing trips and coastal navigation.
It will keep essential safety information available without internet and clearly communicate what is current, cached, unavailable, or awaiting delivery.

## Who it's for
Fishing crews and boat operators who need dependable position awareness, route safety information, and emergency message handling when offshore connectivity is unreliable.

## Core features and experience
- Pre-trip access to the intended fishing area, offline map coverage, coastline, bathymetry, EEZ and restricted-area boundaries, hazards, safe harbors, and forecast layers where real data is available.
- Demo fallback layers where real coverage is unavailable, clearly identified so users do not mistake them for verified live data.
- Browser/device GPS positioning when available, showing current position, speed, heading, distance from shore, planned route, and nearest verified safe harbor.
- A clear GPS unavailable state and visible data-freshness and offline/connectivity indicators.
- Local route-deviation and geofence checks, configurable vessel limits, forecast-expiry warnings, and return-time estimates.
- Persistent SOS messages containing coordinates, timestamp, vessel or user identity, and emergency details; messages remain queued offline and retry automatically when connectivity returns.
- Delivery status and acknowledgement states for queued emergency messages, without claiming that a phone alone can guarantee rescue communication.
- One GitHub-ready ZIP archive containing the completed three-phase implementation after all three suggestions are applied.

## Phase 1: what gets built now
- Build the offline-first foundation: pre-trip download or caching of available marine safety data, offline map and forecast views, local storage, and a prominent offline/data-freshness status.
- Add browser/device GPS tracking with a clear unavailable state, plus the core position, speed, heading, shore-distance, route, and safe-harbor views.
- Add local geofencing, route-deviation checks, vessel-limit settings, forecast-expiry alerts, and return-time estimates using available data and clearly marked demo fallback data where necessary.
- Add the persistent offline SOS queue, automatic retry after connectivity returns, and delivery/acknowledgement status.
- Apply the three selected suggestions as distinct increments internally, then provide one final ZIP after all are complete; satellite messenger, satellite terminal, and marine VHF/DSC integrations remain outside this phase.
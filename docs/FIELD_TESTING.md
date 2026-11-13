# ORCA Offline Safety — Field Validation Checklist

Run every test on a real phone (Android Chrome recommended) with the app opened once while online.

| # | Condition | How to test | Expected result |
|---|-----------|-------------|-----------------|
| 1 | Airplane mode | Download trip kit online → enable airplane mode → reload the app | App opens (service worker), map shows saved tiles, harbors/hazards/boundaries visible, badge shows OFFLINE |
| 2 | GPS unavailable | Deny location permission or go indoors/underground | "GPS DENIED/UNAVAILABLE", checks paused, last known position shown with time; no invented position |
| 3 | Expired forecast | Keep the saved forecast for 12h+ without refreshing (or move device clock forward) | Forecast badge EXPIRED, return-time "Not available", warning alert |
| 4 | Low battery | Let battery fall below 20% (not charging) | Battery alert; GPS switches to power-saving updates |
| 5 | Interrupted connectivity | Airplane mode → Save & send SOS → wait → disable airplane mode | Item shows QUEUED · ON DEVICE, then TRANSMITTED, then ACKNOWLEDGED BY SERVER with an ACK id, without pressing anything |
| 6 | Duplicate prevention | Close the app while an SOS shows TRANSMITTED, reopen online | Same emergency ID is acknowledged once; server attempts count increases, no duplicate record |
| 7 | Route deviation / geofence | Supervised coastal trip: sail > deviation limit off the planned route, approach the sample restricted zone | Off-route and restricted-zone alerts with vibration |
| 8 | Supervised coastal field test | Short trip inside harbour limits with a safety boat, satellite messenger and VHF/DSC aboard | All on-device checks match the real position; outbox recovers after dead zones |

## Not covered by the app
- Satellite messengers (e.g. inReach, ACR Bivy) and VHF/DSC radios are separate hardware/service integrations. ORCA does not transmit through them.
- "Acknowledged" = the ORCA server received the SOS. It is **not** confirmation from Coast Guard or rescue services.
- Harbors, hazards and boundaries are **UNVERIFIED SAMPLE DATA** until replaced with official hydrographic / Coast Guard sources.
- Map tiles: Esri World Street Map + OpenSeaMap sea marks. Check the tile provider's licence for offline caching before commercial use.

import React, { useEffect, useMemo, useState } from "react";
import Screen from "../components/Screen";
import { useApp } from "../context/AppContext";
import { Badge, Icon, TopBar } from "../components/Shared";
import LeafletMap from "../components/LeafletMap";
import { toast } from "../components/ui/sonner";

const LAYERS = ["Coastline", "Bathymetry", "EEZ / restricted", "Hazards", "Safe harbors", "Forecast"];

export default function OfflineCenter() {
  const { profile, offlineSnapshot, offlineQueue, cacheOffline, queueOfflineSos } = useApp();
  const [online, setOnline] = useState(navigator.onLine);
  const [gps, setGps] = useState({ state: "CHECKING", lat: null, lng: null, speed: "—", heading: "—" });
  const [selected, setSelected] = useState(LAYERS);
  const [limits, setLimits] = useState({ deviation: 1.5, maxWind: 30 });
  const [lastFix, setLastFix] = useState(null);

  useEffect(() => {
    const onlineOn = () => setOnline(true); const onlineOff = () => setOnline(false);
    window.addEventListener("online", onlineOn); window.addEventListener("offline", onlineOff);
    if (!navigator.geolocation) { setGps({ state: "UNAVAILABLE" }); return () => {}; }
    const watch = navigator.geolocation.watchPosition((pos) => {
      const { latitude, longitude, speed, heading } = pos.coords;
      setLastFix(new Date());
      setGps({ state: "GPS ACTIVE", lat: latitude, lng: longitude, speed: speed ? `${(speed * 3.6).toFixed(1)} km/h` : "Stationary", heading: heading == null ? "—" : `${Math.round(heading)}°` });
    }, () => setGps({ state: "GPS UNAVAILABLE" }), { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 });
    return () => { navigator.geolocation.clearWatch(watch); window.removeEventListener("online", onlineOn); window.removeEventListener("offline", onlineOff); };
  }, []);

  const freshness = offlineSnapshot.freshness === "CACHED" ? "CACHED LOCALLY" : "NOT DOWNLOADED";
  const queued = useMemo(() => offlineQueue.filter((x) => x.status !== "DELIVERED"), [offlineQueue]);
  const download = async () => { const saved = await cacheOffline("Ratnagiri coast", selected); if (saved) toast.success("Safety layers saved for offline use"); else toast.error("Cache unavailable — keep existing safety sources nearby"); };
  const queueSos = async () => { const item = await queueOfflineSos({ type: "Offline safety check", people: 1, lat: gps.lat, lng: gps.lng, vessel: profile.vessel, details: "Queued from Offline Safety Center" }); if (item) toast.success("SOS queued", { description: "It will retry when a link returns." }); };

  return <Screen id="offline">
    <TopBar title="Offline safety center" right={<Badge tone={online ? "green" : "orange"}>{online ? "LINK AVAILABLE" : "OFFLINE"}</Badge>} />
    <div className="offline-page">
      <div className="offline-hero"><div><span className="eyebrow-sm">ORCA OFFLINE-FIRST MODE</span><h1>Know what remains trusted when the signal disappears.</h1><p>GPS can show your position without internet. It cannot send an SOS by itself.</p></div><div className="offline-hero-badge"><span className="offline-pulse" />{online ? "CONNECTED" : "AIRPLANE / NO LINK"}<small>Store-and-forward protection active</small></div></div>
      <div className="offline-grid">
        <section className="offline-panel"><div className="offline-panel-head"><div><span className="eyebrow-sm">LAYER 01 · PRE-TRIP CACHE</span><h2>Ratnagiri coast kit</h2></div><Badge tone={offlineSnapshot.freshness === "CACHED" ? "green" : "yellow"}>{freshness}</Badge></div><div className="cache-list">{LAYERS.map((layer) => <label key={layer} data-testid={`offline-layer-${layer.toLowerCase().replace(/[^a-z]+/g, "-")}`}><input type="checkbox" checked={selected.includes(layer)} onChange={() => setSelected((s) => s.includes(layer) ? s.filter((x) => x !== layer) : [...s, layer])} />{layer}<span>{selected.includes(layer) ? "READY" : "SKIP"}</span></label>)}</div><div className="offline-note">{offlineSnapshot.source_note || "Download before departure. Demo fallback layers are clearly labelled."}</div><button className="btn primary" data-testid="offline-cache-download-button" onClick={download}><Icon.download /> Save selected layers</button></section>
        <section className="offline-panel"><div className="offline-panel-head"><div><span className="eyebrow-sm">LAYER 02 · ON-DEVICE POSITION</span><h2>Navigation safety</h2></div><Badge tone={gps.state === "GPS ACTIVE" ? "green" : "orange"}>{gps.state}</Badge></div><div className="offline-map"><LeafletMap variant="full" activeLayer="Geofence" height={220} interactive={false} radius /></div><div className="position-grid"><div><b>{gps.lat ? gps.lat.toFixed(4) : "—"}</b><span>Latitude</span></div><div><b>{gps.lng ? gps.lng.toFixed(4) : "—"}</b><span>Longitude</span></div><div><b>{gps.speed}</b><span>Speed</span></div><div><b>{gps.heading}</b><span>Heading</span></div></div><div className="safety-checks"><div><span className="check-dot good" />Route on plan <b>2.1 km clear</b></div><div><span className="check-dot warn" />Nearest verified harbor <b>4.2 km · ~22 min</b></div><div><span className="check-dot good" />Restricted zone <b>Outside boundary</b></div></div><div className="offline-note">{gps.state === "GPS UNAVAILABLE" ? "GPS unavailable. Turn on device location; ORCA will not guess your position." : `Local checks continue without internet${lastFix ? ` · last fix ${lastFix.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}.`}</div></section>
        <section className="offline-panel"><div className="offline-panel-head"><div><span className="eyebrow-sm">LAYER 02 · LOCAL LIMITS</span><h2>Vessel guardrails</h2></div><Badge tone="teal">ON DEVICE</Badge></div><label className="range-row">Route deviation <b>{limits.deviation.toFixed(1)} km</b><input data-testid="route-deviation-limit" type="range" min="0.5" max="5" step="0.5" value={limits.deviation} onChange={(e) => setLimits({ ...limits, deviation: Number(e.target.value) })} /></label><label className="range-row">Wind ceiling <b>{limits.maxWind} km/h</b><input data-testid="wind-limit" type="range" min="15" max="60" step="5" value={limits.maxWind} onChange={(e) => setLimits({ ...limits, maxWind: Number(e.target.value) })} /></label><div className="return-card"><span className="eyebrow-sm">RETURN-TIME ESTIMATE</span><strong>Begin return by 14:15</strong><span>Forecast window expires in 3h 24m · confirm conditions before acting</span></div><div className="offline-note">Forecast data is {offlineSnapshot.freshness === "CACHED" ? "cached and time-stamped" : "not yet cached"}; it is not presented as live.</div></section>
        <section className="offline-panel queue-panel"><div className="offline-panel-head"><div><span className="eyebrow-sm">LAYER 03 · STORE & FORWARD</span><h2>Emergency queue</h2></div><Badge tone={queued.length ? "orange" : "green"}>{queued.length} QUEUED</Badge></div><p className="queue-copy">An offline SOS stores coordinates, timestamp, vessel, people onboard, and details. It retries when a link returns; a phone alone cannot guarantee delivery.</p>{queued.slice(0, 3).map((item) => <div className="queue-item" key={item.id} data-testid={`offline-queue-${item.id}`}><div><b>{item.type}</b><span>{item.position?.lat ? `${item.position.lat.toFixed(4)}°, ${item.position.lng.toFixed(4)}°` : "No GPS fix"}</span></div><Badge tone="orange">{item.status.replaceAll("_", " ")}</Badge></div>)}<button className="btn sos" data-testid="offline-queue-sos-button" onClick={queueSos}>Queue SOS with current position</button><div className="offline-note">Delivery acknowledgements only appear after a supported communication service confirms receipt.</div></section>
      </div>
    </div>
  </Screen>;
}
import React from "react";
import { Badge, Icon } from "../Shared";
import LeafletMap from "../LeafletMap";
import { useApp } from "../../context/AppContext";
import { useOffline } from "../../offline/OfflineContext";
import { SOS_STATUS } from "../../offline/sosOutbox";
import { fmtDuration, fmtKm } from "../../offline/geo";

const time = (v) => (v ? new Date(v).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const mb = (b) => (b == null ? "—" : `${(b / 1048576).toFixed(1)} MB`);
const FC_TONE = { FRESH: "green", AGING: "teal", STALE: "yellow", EXPIRED: "red", NONE: "orange" };

const Row = ({ id, label, value, tone = "green" }) => (
  <div className="kit-row" data-testid={`kit-row-${id}`}><span className={`check-dot ${tone}`} />{label}<b>{value}</b></div>
);

export function TripKitPanel() {
  const { datasets, forecast, kit, kitTileTarget, progress, downloadKit, refreshForecast, storage, online, safety } = useOffline();
  const fc = safety.conditions?.status;
  const tilesOk = kit && kit.failed === 0;
  return (
    <section className="offline-panel" data-testid="trip-kit-panel">
      <div className="offline-panel-head">
        <div><span className="eyebrow-sm">LAYER 01 · PRE-TRIP CACHE</span><h2>{datasets?.area || "Ratnagiri coast"} trip kit</h2></div>
        <Badge tone={kit ? (tilesOk ? "green" : "yellow") : "orange"}>{kit ? "SAVED ON DEVICE" : "NOT DOWNLOADED"}</Badge>
      </div>
      <div className="kit-list">
        <Row id="tiles" label="Map tiles + sea marks (zoom 9–13)" tone={tilesOk ? "good" : kit ? "warn" : "bad"}
          value={kit ? `${kit.tiles}/${kit.total}` : kitTileTarget ? `0/${kitTileTarget}` : "Not saved"} />
        <Row id="coastline" label="Coastline & planned route" tone={datasets ? "good" : "bad"} value={datasets ? "Saved" : "Not saved"} />
        <Row id="harbors" label="Safe harbors" tone={datasets ? "good" : "bad"} value={datasets ? `${datasets.harbors.length} saved` : "Not saved"} />
        <Row id="hazards" label="Hazards" tone={datasets ? "good" : "bad"} value={datasets ? `${datasets.hazards.length} saved` : "Not saved"} />
        <Row id="boundaries" label="Restricted boundaries" tone={datasets ? "good" : "bad"} value={datasets ? `${datasets.restricted.length} saved` : "Not saved"} />
        <Row id="forecast" label="72h marine forecast" tone={fc?.state === "FRESH" || fc?.state === "AGING" ? "good" : forecast ? "warn" : "bad"}
          value={forecast ? `${time(forecast.fetched_at)} · ${fc?.state}` : "Not saved"} />
      </div>
      {progress && (
        <div className="kit-progress" data-testid="kit-progress">
          <div className="kit-progress-bar"><span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 5}%` }} /></div>
          <small>{progress.phase}{progress.total ? ` · ${progress.done}/${progress.total} tiles · ${mb(progress.bytes)}` : "…"}{progress.failed ? ` · ${progress.failed} failed` : ""}</small>
        </div>
      )}
      {datasets && !datasets.verified && <div className="offline-note warn-note" data-testid="unverified-data-note">{datasets.note}</div>}
      <div className="offline-note">Forecast: {forecast ? forecast.source : "Open-Meteo marine + wind"} · stored with its download time and never shown as live. Device storage: {mb(storage?.usage)}{storage?.persisted ? " · protected from automatic clean-up" : ""}.</div>
      <div className="btn-row">
        <button className="btn primary" data-testid="offline-kit-download-button" disabled={!!progress || !online} onClick={downloadKit}>
          <Icon.download /> {kit ? "Update trip kit" : "Download trip kit"}
        </button>
        <button className="btn ghost" data-testid="offline-forecast-refresh-button" disabled={!!progress || !online || !datasets} onClick={() => refreshForecast()}>Refresh forecast</button>
      </div>
      {!online && <div className="offline-note" data-testid="kit-offline-note">No connection — using what is already saved on this device.</div>}
    </section>
  );
}

export function PositionPanel() {
  const { gps, lastKnown, safety, datasets, lowPower } = useOffline();
  const f = gps.fix;
  const g = safety.geofence;
  return (
    <section className="offline-panel" data-testid="position-panel">
      <div className="offline-panel-head">
        <div><span className="eyebrow-sm">LAYER 02 · ON-DEVICE POSITION</span><h2>Navigation safety</h2></div>
        <Badge tone={gps.state === "ACTIVE" ? "green" : "orange"}><span data-testid="gps-state">{gps.state === "ACTIVE" ? "GPS ACTIVE" : `GPS ${gps.state}`}</span></Badge>
      </div>
      <div className="offline-map"><LeafletMap variant="full" live base="chart" height={260} interactive /></div>
      <div className="position-grid">
        <div><b data-testid="gps-lat">{f ? f.lat.toFixed(4) : "—"}</b><span>Latitude</span></div>
        <div><b data-testid="gps-lng">{f ? f.lng.toFixed(4) : "—"}</b><span>Longitude</span></div>
        <div><b>{f?.speedKmh != null ? `${f.speedKmh.toFixed(1)}` : "—"}</b><span>km/h</span></div>
        <div><b>{f?.accuracy != null ? `±${Math.round(f.accuracy)}m` : "—"}</b><span>Accuracy</span></div>
      </div>
      {f && datasets ? (
        <div className="safety-checks" data-testid="safety-checks">
          <div data-testid="check-route"><span className={`check-dot ${safety.alerts.some((a) => a.id === "deviation") ? "bad" : "good"}`} />Distance from planned route <b>{fmtKm(safety.deviationKm)}</b></div>
          <div data-testid="check-harbor"><span className="check-dot good" />Nearest safe harbor <b>{safety.harbor.name} · {fmtKm(safety.harbor.distanceKm)} · ~{fmtDuration(safety.harbor.etaMin)}</b></div>
          <div data-testid="check-geofence"><span className={`check-dot ${g.state === "INSIDE" ? "bad" : g.state === "NEAR" ? "warn" : "good"}`} />Restricted zone <b>{g.state === "INSIDE" ? "INSIDE BOUNDARY" : `${fmtKm(g.edgeKm)} outside`}</b></div>
          <div data-testid="check-hazards"><span className={`check-dot ${safety.hazards.length ? "bad" : "good"}`} />Hazards within 500 m <b>{safety.hazards.length ? safety.hazards.map((h) => h.name).join(", ") : "None"}</b></div>
        </div>
      ) : (
        <div className="offline-note warn-note" data-testid="position-unavailable-note">
          {!f ? `No live GPS fix — checks are paused, ORCA will not guess your position.${lastKnown ? ` Last known: ${lastKnown.lat.toFixed(4)}, ${lastKnown.lng.toFixed(4)} at ${time(lastKnown.at)}.` : ""}` : "Download the trip kit to check harbors, hazards and boundaries."}
        </div>
      )}
      <div className="offline-note">GPS works without internet. {lowPower ? "Low battery: GPS is in power-saving mode (slower updates)." : "Checks run on this device every time your position updates."}</div>
    </section>
  );
}

export function LimitsPanel() {
  const { limits, setLimits, safety } = useOffline();
  const c = safety.conditions;
  const r = safety.ret;
  const slider = (key, label, min, max, step, unit) => (
    <label className="range-row">{label} <b>{limits[key]} {unit}</b>
      <input data-testid={`limit-${key}`} type="range" min={min} max={max} step={step} value={limits[key]} onChange={(e) => setLimits({ [key]: Number(e.target.value) })} />
    </label>
  );
  return (
    <section className="offline-panel" data-testid="limits-panel">
      <div className="offline-panel-head">
        <div><span className="eyebrow-sm">LAYER 02 · VESSEL LIMITS</span><h2>Guardrails & return time</h2></div>
        <Badge tone={FC_TONE[c?.status.state || "NONE"]}><span data-testid="forecast-state">{c ? `FORECAST ${c.status.state}` : "NO FORECAST"}</span></Badge>
      </div>
      {slider("deviationKm", "Max route deviation", 0.5, 5, 0.5, "km")}
      {slider("maxWind", "Wind limit", 15, 60, 5, "km/h")}
      {slider("maxWave", "Wave limit", 0.5, 4, 0.5, "m")}
      {slider("cruiseKmh", "Cruise speed (when stopped)", 5, 30, 1, "km/h")}
      {c && (
        <div className="position-grid" data-testid="forecast-now">
          <div><b>{Math.round(c.wind_kmh)}</b><span>Wind km/h</span></div>
          <div><b>{Math.round(c.gust_kmh)}</b><span>Gust km/h</span></div>
          <div><b>{c.wave_m != null ? c.wave_m.toFixed(1) : "—"}</b><span>Wave m</span></div>
          <div><b>{c.swell_m != null ? c.swell_m.toFixed(1) : "—"}</b><span>Swell m</span></div>
        </div>
      )}
      <div className={`return-card ${r.overdue || !r.returnBy ? "danger" : ""}`} data-testid="return-estimate">
        <span className="eyebrow-sm">RETURN-TIME ESTIMATE</span>
        <strong>{r.returnBy ? (r.overdue ? `Overdue since ${clock(r.returnBy)}` : `Begin return by ${clock(r.returnBy)}`) : "Not available"}</strong>
        <span>{r.reason}{r.expiresAt ? ` · forecast expires ${clock(r.expiresAt)}` : ""}{safety.travelMin != null ? ` · ~${fmtDuration(safety.travelMin)} to harbor + 30 min buffer` : ""}</span>
      </div>
    </section>
  );
}

const LEVEL_TONE = { CRITICAL: "red", WARNING: "orange", INFO: "teal" };
export function AlertsPanel() {
  const { safety } = useOffline();
  const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  const list = [...safety.alerts].sort((a, b) => order[a.level] - order[b.level]);
  return (
    <section className="offline-panel" data-testid="alerts-panel">
      <div className="offline-panel-head">
        <div><span className="eyebrow-sm">LAYER 02 · LOCAL ALERTS</span><h2>Active safety alerts</h2></div>
        <Badge tone={list.some((a) => a.level === "CRITICAL") ? "red" : list.length ? "orange" : "green"}><span data-testid="alerts-count">{list.length} ACTIVE</span></Badge>
      </div>
      <div className="alert-list">
        {list.length === 0 && <div className="offline-note">All on-device checks are within your limits.</div>}
        {list.map((a) => (
          <div className={`alert-item ${a.level.toLowerCase()}`} key={a.id} data-testid={`local-alert-${a.id}`}>
            <Badge tone={LEVEL_TONE[a.level]}>{a.level}</Badge><div><b>{a.title}</b><span>{a.detail}</span></div>
          </div>
        ))}
      </div>
    </section>
  );
}

const SOS_LABEL = {
  [SOS_STATUS.QUEUED]: ["orange", "QUEUED · ON DEVICE"],
  [SOS_STATUS.TRANSMITTED]: ["yellow", "TRANSMITTED · AWAITING RECEIPT"],
  [SOS_STATUS.ACKNOWLEDGED]: ["green", "ACKNOWLEDGED BY SERVER"],
};

export function SosOutboxPanel() {
  const { outbox, queueSos, flush, online, vesselId, gps, lastKnown } = useOffline();
  const { profile } = useApp();
  const pending = outbox.filter((x) => x.status !== SOS_STATUS.ACKNOWLEDGED).length;
  const send = () => queueSos({ type: "Offline SOS", people: 1, details: "Sent from Offline Safety Center", vesselName: profile.vessel });
  return (
    <section className="offline-panel queue-panel" data-testid="sos-outbox-panel">
      <div className="offline-panel-head">
        <div><span className="eyebrow-sm">LAYER 03 · STORE & FORWARD</span><h2>Emergency outbox</h2></div>
        <Badge tone={pending ? "orange" : "green"}><span data-testid="sos-pending-count">{pending} PENDING</span></Badge>
      </div>
      <p className="queue-copy">Every SOS is saved on this phone first (ID, GPS position, time, vessel <b>{vesselId}</b>, details), then sent. With no signal it waits and retries automatically when the connection returns.</p>
      {outbox.slice(0, 5).map((x) => {
        const [tone, label] = SOS_LABEL[x.status];
        return (
          <div className="queue-item" key={x.emergency_id} data-testid={`sos-item-${x.emergency_id}`}>
            <div>
              <b>{x.type} · {x.emergency_id.slice(0, 8)}</b>
              <span>{x.lat != null ? `${x.lat.toFixed(4)}°, ${x.lng.toFixed(4)}°` : "No GPS fix"} · {time(x.captured_at)} · {x.attempts} attempt{x.attempts === 1 ? "" : "s"}</span>
              {x.ack && <span data-testid="sos-ack-id">{x.ack.ack_id} · received {time(x.ack.received_at)}</span>}
              {x.status !== SOS_STATUS.ACKNOWLEDGED && x.last_error && <span>Last error: {x.last_error} · retry {x.next_retry_at > Date.now() ? `at ${clock(x.next_retry_at)}` : "now"}</span>}
            </div>
            <Badge tone={tone}><span data-testid="sos-item-status">{label}</span></Badge>
          </div>
        );
      })}
      <div className="btn-row">
        <button className="btn sos" data-testid="offline-sos-send-button" onClick={send}>
          Save & send SOS {gps.fix ? "with GPS position" : lastKnown ? "with last known position" : "(no position)"}
        </button>
        <button className="btn ghost" data-testid="offline-sos-retry-button" disabled={!online || !pending} onClick={() => flush(true)}>Retry now</button>
      </div>
      <div className="offline-note">“Acknowledged” means the ORCA server received it — not that Coast Guard or rescuers have. Satellite messengers and VHF/DSC radios are separate hardware and are <b>not connected</b> to this app; keep them aboard.</div>
    </section>
  );
}

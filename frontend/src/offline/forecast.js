export const FRESH_H = 3;
export const STALE_H = 6;
export const EXPIRE_H = 12;
const BUFFER_MIN = 30;

export function forecastStatus(fc, now = Date.now()) {
  if (!fc) return { state: "NONE", ageH: null, label: "No forecast saved" };
  const ageH = (now - new Date(fc.fetched_at).getTime()) / 3.6e6;
  const pastHorizon = fc.valid_until && now / 1000 > fc.valid_until;
  if (ageH >= EXPIRE_H || pastHorizon) return { state: "EXPIRED", ageH, label: "Forecast expired — do not rely on it" };
  if (ageH >= STALE_H) return { state: "STALE", ageH, label: "Forecast is getting old" };
  if (ageH >= FRESH_H) return { state: "AGING", ageH, label: "Forecast still usable" };
  return { state: "FRESH", ageH, label: "Forecast is fresh" };
}

export function currentHour(fc, now = Date.now()) {
  if (!fc?.hours?.length) return null;
  const s = now / 1000;
  return [...fc.hours].reverse().find((h) => h.t <= s) || fc.hours[0];
}

// First future hour that breaks the vessel limits.
export function firstExceedance(fc, limits, now = Date.now()) {
  if (!fc?.hours) return null;
  const s = now / 1000;
  return fc.hours.find((h) => h.t >= s - 3600 && (
    (h.wind_kmh ?? 0) > limits.maxWind || (h.gust_kmh ?? 0) > limits.maxWind * 1.4 || (h.wave_m ?? 0) > limits.maxWave)) || null;
}

// Return-by = earliest of (limit breach, forecast expiry) minus travel time and a safety buffer.
export function returnEstimate(fc, limits, travelMin, now = Date.now()) {
  const status = forecastStatus(fc, now);
  if (status.state === "NONE" || status.state === "EXPIRED") return { status, returnBy: null, reason: status.label };
  const breach = firstExceedance(fc, limits, now);
  const expiryMs = new Date(fc.fetched_at).getTime() + EXPIRE_H * 3.6e6;
  const breachMs = breach ? breach.t * 1000 : Infinity;
  const limitMs = Math.min(breachMs, expiryMs, (fc.valid_until || Infinity) * 1000);
  const returnBy = limitMs - (travelMin + BUFFER_MIN) * 60000;
  const reason = breachMs <= expiryMs
    ? `Forecast breaks your limits at ${new Date(breachMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "Forecast confidence ends — refresh before staying out";
  return { status, returnBy, breach, expiresAt: expiryMs, reason, overdue: returnBy < now };
}

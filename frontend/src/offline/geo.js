const R = 6371;
const rad = (d) => (d * Math.PI) / 180;

export function haversineKm([lat1, lng1], [lat2, lng2]) {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Local equirectangular projection (km) around a reference latitude — accurate at coastal scales.
const project = ([lat, lng], refLat) => [rad(lng) * R * Math.cos(rad(refLat)), rad(lat) * R];

export function distanceToSegmentKm(p, a, b) {
  const [px, py] = project(p, p[0]);
  const [ax, ay] = project(a, p[0]);
  const [bx, by] = project(b, p[0]);
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function distanceToPolylineKm(p, line) {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i += 1) best = Math.min(best, distanceToSegmentKm(p, line[i], line[i + 1]));
  return best;
}

export function pointInPolygon([lat, lng], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const distanceToPolygonEdgeKm = (p, poly) => distanceToPolylineKm(p, [...poly, poly[0]]);

export function nearest(p, places) {
  return places.reduce((best, pl) => {
    const d = haversineKm(p, [pl.lat, pl.lng]);
    return !best || d < best.distanceKm ? { ...pl, distanceKm: d } : best;
  }, null);
}

export const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
export const fmtDuration = (min) => (min < 60 ? `${Math.round(min)} min` : `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`);

/**
 * Polygon helpers for the map's draw-an-area search.
 *
 * Ported from mls-v2 `lib/map/polygon.ts`, plus the URL codec that v2 lacked:
 * a drawn area lives in `?poly=lat,lng;lat,lng;…` so it survives a refresh, a
 * shared link, the back button and a saved search — the same reason every
 * other filter lives in the URL.
 */

export type LatLngPoint = { lat: number; lng: number };

/** Hand-drawn areas are capped so the URL (and the backend's scan) stays small. */
export const MAX_POLYGON_POINTS = 20;

/** 5 decimals ≈ 1.1 m — finer than a finger tap, short enough for a URL. */
const PRECISION = 5;

function round(value: number): number {
  return Number(value.toFixed(PRECISION));
}

function validPoint(point: LatLngPoint): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  );
}

function samePoint(a: LatLngPoint, b: LatLngPoint): boolean {
  return a.lat === b.lat && a.lng === b.lng;
}

/** Returns a closed ring (first point repeated last), or [] for < 3 points. */
export function normalizePolygonRing(points: LatLngPoint[]): LatLngPoint[] {
  const normalized = points
    .map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }))
    .filter((point) => !Number.isNaN(point.lat) && !Number.isNaN(point.lng));

  if (normalized.length < 3) return [];

  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  return samePoint(first, last) ? normalized : [...normalized, first];
}

/** Drops a repeated closing point, so the URL never stores it twice. */
export function openRing(points: LatLngPoint[]): LatLngPoint[] {
  if (points.length > 1 && samePoint(points[0], points[points.length - 1])) {
    return points.slice(0, -1);
  }
  return points;
}

export function getBoundingBoxFromPoints(points: LatLngPoint[]) {
  if (points.length === 0) return null;
  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  return {
    latMin: Math.min(...latitudes),
    latMax: Math.max(...latitudes),
    lngMin: Math.min(...longitudes),
    lngMax: Math.max(...longitudes),
  };
}

function isPointOnSegment(
  point: LatLngPoint,
  segStart: LatLngPoint,
  segEnd: LatLngPoint,
): boolean {
  const epsilon = 1e-10;
  const cross =
    (point.lng - segStart.lng) * (segEnd.lat - segStart.lat) -
    (point.lat - segStart.lat) * (segEnd.lng - segStart.lng);
  if (Math.abs(cross) > epsilon) return false;

  const dot =
    (point.lng - segStart.lng) * (segEnd.lng - segStart.lng) +
    (point.lat - segStart.lat) * (segEnd.lat - segStart.lat);
  if (dot < -epsilon) return false;

  const squaredLen = (segEnd.lng - segStart.lng) ** 2 + (segEnd.lat - segStart.lat) ** 2;
  return dot - squaredLen <= epsilon;
}

/** Ray-casting point-in-polygon; edges count as inside by default. */
export function isPointInPolygon(
  point: LatLngPoint,
  ring: LatLngPoint[],
  edgeInclusive = true,
): boolean {
  const polygon = normalizePolygonRing(ring);
  if (polygon.length < 4) return false;

  // The ring is closed, so consecutive pairs already cover every edge. (v2
  // paired last→first too, which on a closed ring is a zero-length segment
  // that the on-edge test accepted — every point read as inside.)
  let inside = false;
  for (let i = 1; i < polygon.length; i++) {
    const start = polygon[i - 1];
    const end = polygon[i];

    if (edgeInclusive && isPointOnSegment(point, start, end)) return true;

    const intersects =
      start.lat > point.lat !== end.lat > point.lat &&
      point.lng <
        ((end.lng - start.lng) * (point.lat - start.lat)) / (end.lat - start.lat) + start.lng;

    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * `[{lat,lng}…]` → `"43.65,-79.38;43.7,-79.4;…"`. Open ring, 5 decimals.
 * Returns "" for anything that is not a usable polygon, so callers can drop it.
 */
export function serializePolygonParam(points: LatLngPoint[] | undefined | null): string {
  if (!points) return "";
  const ring = openRing(points.filter(validPoint)).slice(0, MAX_POLYGON_POINTS);
  if (ring.length < 3) return "";
  return ring.map((point) => `${round(point.lat)},${round(point.lng)}`).join(";");
}

/**
 * Inverse of `serializePolygonParam`. Hostile or hand-edited URLs are expected,
 * so any malformed pair invalidates the whole value rather than silently
 * producing a different shape than the one the user drew.
 */
export function parsePolygonParam(raw: string | undefined | null): LatLngPoint[] | null {
  if (!raw) return null;
  const pairs = raw.split(";").filter(Boolean);
  if (pairs.length < 3 || pairs.length > MAX_POLYGON_POINTS + 1) return null;

  const points: LatLngPoint[] = [];
  for (const pair of pairs) {
    const [latRaw, lngRaw, extra] = pair.split(",");
    if (extra !== undefined || !latRaw || !lngRaw) return null;
    const point = { lat: round(Number(latRaw)), lng: round(Number(lngRaw)) };
    if (!validPoint(point)) return null;
    points.push(point);
  }

  const ring = openRing(points);
  return ring.length >= 3 && ring.length <= MAX_POLYGON_POINTS ? ring : null;
}

/**
 * Slippy-map tile helpers for school location thumbnails.
 *
 * The Ministry school file has coordinates but no photos. A single OSM tile
 * centred on the school is the honest visual we can show without a Maps API
 * key — the building itself when the campus fills the tile, otherwise the
 * immediate neighbourhood.
 */

export function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number; z: number } {
  const z = Math.min(18, Math.max(1, Math.round(zoom)));
  const n = 2 ** z;
  const latRad = (lat * Math.PI) / 180;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return {
    z,
    x: ((x % n) + n) % n,
    y: Math.min(n - 1, Math.max(0, y)),
  };
}

/** App-relative URL for a cached OSM tile of a school location. */
export function schoolLocationImageSrc(lat: number, lon: number, zoom = 16): string {
  const params = new URLSearchParams({
    lat: lat.toFixed(6),
    lon: lon.toFixed(6),
    z: String(zoom),
  });
  return `/api/geo/static-map?${params}`;
}

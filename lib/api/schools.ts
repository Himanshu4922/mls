/**
 * Ontario Ministry of Education school file, via mls-v2.
 *
 * Percentages are the published share of students who met the EQAO provincial
 * standard, averaged across the subjects the file reports for that level.
 * The file has school locations, not attendance boundaries.
 */

import { apiFetch, type RequestOptions } from "@/lib/api/client";
import { schoolLocationImageSrc } from "@/lib/utils/mapTile";

const MLS = "/api/mls";

export interface OfficialSchool {
  id: string;
  name: string;
  board: string;
  kind: string;
  level: string;
  city: string;
  distanceKm: number | null;
  website: string | null;
  eqaoPercent: number | null;
  eqaoLabel: string;
  latitude: number | null;
  longitude: number | null;
  /**
   * Location map thumbnail when coords exist. The Ministry file has no school
   * photos; this is an OSM tile of the campus / neighbourhood instead.
   */
  imageUrl: string | null;
}

interface RawSchool {
  id?: string;
  name?: string;
  board?: string;
  kind?: string;
  level?: string;
  city?: string;
  distance_km?: number | null;
  website?: string;
  eqao_percent?: number | null;
  eqao_label?: string;
  latitude?: number | null;
  longitude?: number | null;
}

function mapSchool(school: RawSchool): OfficialSchool | null {
  const name = school.name?.trim() || "";
  if (!name) return null;
  const latitude = typeof school.latitude === "number" ? school.latitude : null;
  const longitude = typeof school.longitude === "number" ? school.longitude : null;
  return {
    id: school.id?.trim() || name,
    name,
    board: school.board?.trim() || "",
    kind: school.kind?.trim() || "",
    level: school.level?.trim() || "",
    city: school.city?.trim() || "",
    distanceKm: typeof school.distance_km === "number" ? school.distance_km : null,
    website: school.website?.trim() || null,
    eqaoPercent: typeof school.eqao_percent === "number" ? school.eqao_percent : null,
    eqaoLabel: school.eqao_label?.trim() || "",
    latitude,
    longitude,
    imageUrl:
      latitude !== null && longitude !== null
        ? schoolLocationImageSrc(latitude, longitude)
        : null,
  };
}

export async function getSchoolsNear(
  lat: number,
  lon: number,
  options: RequestOptions & { radiusKm?: number } = {},
): Promise<OfficialSchool[]> {
  const { radiusKm = 8, ...rest } = options;
  const data = await apiFetch<{ schools?: RawSchool[] }>(`${MLS}/schools/near/`, {
    revalidate: 86_400,
    ...rest,
    params: { lat, lon, radius: radiusKm },
  });
  return (data.schools ?? []).map(mapSchool).filter((school): school is OfficialSchool => school !== null);
}

export async function getTopSchools(options: RequestOptions = {}): Promise<OfficialSchool[]> {
  const data = await apiFetch<{ schools?: RawSchool[] }>(`${MLS}/schools/top/`, {
    revalidate: 86_400,
    ...options,
    params: { limit: 4 },
  });
  return (data.schools ?? []).map(mapSchool).filter((school): school is OfficialSchool => school !== null);
}

/** Map search for listings inside a 2 km box around a school. Not an attendance boundary. */
export function homesNearSchoolHref(lat: number, lng: number, km = 2): string {
  const latDelta = km / 111;
  const lngDelta = km / (111 * Math.cos((lat * Math.PI) / 180));
  const ring = [
    [lat - latDelta, lng - lngDelta],
    [lat - latDelta, lng + lngDelta],
    [lat + latDelta, lng + lngDelta],
    [lat + latDelta, lng - lngDelta],
  ];
  const poly = ring.map(([schoolLat, schoolLng]) => `${schoolLat.toFixed(5)},${schoolLng.toFixed(5)}`).join(";");
  return `/map-search?poly=${encodeURIComponent(poly)}`;
}

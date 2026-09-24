import type { FollowedArea, WatchedEntry } from "@/lib/api/watched";
import type { PropertySummary } from "@/lib/types/domain";
import { STATUS_GROUP_LABELS, type StatusGroup } from "@/lib/utils/status";

/**
 * Shared vocabulary for the navbar Watched menu and the /watched page, so a
 * "View all" link from the menu always lands on the same tab and filter.
 */

export type WatchedTabId =
  | "properties"
  | "notes"
  | "toured"
  | "areas"
  | "communities"
  | "history"
  | "alerts"
  | "saved-search"
  | "listings";

export const WATCHED_TAB_LABELS: Record<WatchedTabId, string> = {
  properties: "Properties",
  notes: "Notes",
  toured: "Toured",
  areas: "Areas",
  communities: "Communities",
  history: "Recently Viewed",
  alerts: "Alerts",
  "saved-search": "Saved search",
  listings: "My listings",
};

export const STATUS_GROUPS: StatusGroup[] = ["active", "sold", "delisted"];

export const STATUS_TAB_ITEMS = STATUS_GROUPS.map((id) => ({
  id,
  label: STATUS_GROUP_LABELS[id],
}));

export function isStatusGroup(value: string | null | undefined): value is StatusGroup {
  return value === "active" || value === "sold" || value === "delisted";
}

export function watchedHref(tab: WatchedTabId, status?: StatusGroup): string {
  const params = new URLSearchParams({ tab });
  if (tab === "properties" && status) params.set("status", status);
  return `/watched?${params.toString()}`;
}

/**
 * Status group for a hydrated listing.
 *
 * `PropertySummary.status` is already normalized (lib/api/mappers.ts), so
 * `statusGroup()` — which expects the raw feed word — would file "other" under
 * For Sale. Anything neither active nor closed is off the market, which is
 * what the reference's De-listed filter means.
 */
export function propertyGroup(property: PropertySummary): StatusGroup {
  if (property.status === "active") return "active";
  if (property.status === "sold" || property.status === "leased") return "sold";
  return "delisted";
}

/**
 * Areas vs Communities. The backend stores `area_kind` as free text (model
 * choices: community, neighborhood, region, city); the two neighbourhood-scale
 * kinds read as communities, everything broader as an area.
 */
const COMMUNITY_KINDS = new Set(["community", "neighborhood", "neighbourhood"]);

export function splitAreas(areas: FollowedArea[]) {
  const communities: FollowedArea[] = [];
  const regions: FollowedArea[] = [];
  for (const area of areas) {
    (COMMUNITY_KINDS.has(area.areaKind.toLowerCase()) ? communities : regions).push(area);
  }
  return { communities, areas: regions };
}

export function areaHref(area: FollowedArea): string {
  return `/listings?city=${encodeURIComponent(area.areaLabel ?? area.areaKey)}`;
}

export function snapshotAddress(entry: WatchedEntry): string {
  const address = entry.snapshot.address;
  return typeof address === "string" && address ? address : entry.propertyKey;
}

export function snapshotCity(entry: WatchedEntry): string | null {
  const city = entry.snapshot.city;
  return typeof city === "string" && city ? city : null;
}

export function snapshotPrice(entry: WatchedEntry): number | null {
  return typeof entry.snapshot.price === "number" ? entry.snapshot.price : null;
}

export function snapshotImage(entry: WatchedEntry): string | null {
  const image = entry.snapshot.image;
  return typeof image === "string" && image ? image : null;
}

export function excerpt(body: string, max = 120): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

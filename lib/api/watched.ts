/**
 * Saved-homes surface: favourites, viewing history, toured homes, followed
 * areas, alert preferences and per-listing notes.
 *
 * Mirrors the six tabs in HomeAtlasUI's navbar "Watched" dropdown
 * (Properties · Notes · Toured · Areas · Communities · Recently Viewed).
 *
 * CONTRACT NOTE: the mutation endpoints take `property_key`, NOT `listing_key`
 * (`WatchedMutationSerializer`, mls/serializers.py:265). The read side returns
 * `property_key` too. Only the beacon/notes endpoints use `listing_key`.
 */

import { apiFetch, type RequestOptions } from "@/lib/api/client";

const MLS = "/api/mls";

/** Snapshot the UI stores alongside a saved key so lists render without an N+1. */
export interface WatchedSnapshot {
  address?: string;
  price?: number | null;
  city?: string | null;
  image?: string | null;
  beds?: number | null;
  baths?: number | null;
  [key: string]: unknown;
}

export interface WatchedEntry {
  propertyKey: string;
  snapshot: WatchedSnapshot;
  /** created_at / viewed_at / toured_at, depending on the collection. */
  timestamp: string | null;
}

export interface FollowedArea {
  areaKey: string;
  areaLabel: string | null;
  areaKind: string;
  createdAt: string | null;
}

export interface AlertPreferences {
  priceChanges: boolean;
  newListings: boolean;
  statusUpdates: boolean;
  emailEnabled: boolean;
  emailRecommend: boolean;
  emailWatchedProperty: boolean;
  emailWatchedCommunity: boolean;
  emailWatchedArea: boolean;
  pushWatchedProperty: boolean;
}

export interface WatchedOverview {
  favorites: WatchedEntry[];
  history: WatchedEntry[];
  toured: WatchedEntry[];
  followedAreas: FollowedArea[];
  alertPreferences: AlertPreferences;
}

interface RawEntry {
  property_key?: string;
  property_snapshot_json?: WatchedSnapshot;
  created_at?: string;
  viewed_at?: string;
  toured_at?: string;
}

function mapEntry(raw: RawEntry): WatchedEntry {
  return {
    propertyKey: raw.property_key ?? "",
    snapshot: raw.property_snapshot_json ?? {},
    timestamp: raw.created_at ?? raw.viewed_at ?? raw.toured_at ?? null,
  };
}

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  priceChanges: true,
  newListings: true,
  statusUpdates: true,
  emailEnabled: true,
  emailRecommend: false,
  emailWatchedProperty: true,
  emailWatchedCommunity: false,
  emailWatchedArea: false,
  pushWatchedProperty: false,
};

function mapPreferences(raw: Record<string, unknown> | undefined): AlertPreferences {
  if (!raw) return DEFAULT_ALERT_PREFERENCES;
  const bool = (key: string, fallback: boolean) =>
    typeof raw[key] === "boolean" ? (raw[key] as boolean) : fallback;
  return {
    priceChanges: bool("price_changes", true),
    newListings: bool("new_listings", true),
    statusUpdates: bool("status_updates", true),
    emailEnabled: bool("email_enabled", true),
    emailRecommend: bool("email_recommend", false),
    emailWatchedProperty: bool("email_watched_property", true),
    emailWatchedCommunity: bool("email_watched_community", false),
    emailWatchedArea: bool("email_watched_area", false),
    pushWatchedProperty: bool("push_watched_property", false),
  };
}

/** GET watched/ — the whole saved surface in one authenticated call. */
export async function getWatchedOverview(
  token: string,
  options: RequestOptions = {},
): Promise<WatchedOverview> {
  const data = await apiFetch<{
    favorites?: RawEntry[];
    history?: RawEntry[];
    toured?: RawEntry[];
    followed_areas?: Array<{
      area_key?: string;
      area_label?: string;
      area_kind?: string;
      created_at?: string;
    }>;
    alert_preferences?: Record<string, unknown>;
  }>(`${MLS}/watched/`, { ...options, token });

  return {
    favorites: (data.favorites ?? []).map(mapEntry).filter((e) => e.propertyKey),
    history: (data.history ?? []).map(mapEntry).filter((e) => e.propertyKey),
    toured: (data.toured ?? []).map(mapEntry).filter((e) => e.propertyKey),
    followedAreas: (data.followed_areas ?? [])
      .map((area) => ({
        areaKey: area.area_key ?? "",
        areaLabel: area.area_label?.trim() || null,
        areaKind: area.area_kind ?? "community",
        createdAt: area.created_at ?? null,
      }))
      .filter((area) => area.areaKey),
    alertPreferences: mapPreferences(data.alert_preferences),
  };
}

/* -------------------------------------------------------------------------- */
/* Mutations — all take `property_key`                                         */
/* -------------------------------------------------------------------------- */

export async function toggleFavorite(
  token: string,
  propertyKey: string,
  snapshot: WatchedSnapshot = {},
): Promise<{ isFavorite: boolean }> {
  const data = await apiFetch<{ is_favorite?: boolean }>(
    `${MLS}/watched/favorites/toggle/`,
    {
      method: "POST",
      token,
      body: { property_key: propertyKey, property_snapshot_json: snapshot },
    },
  );
  return { isFavorite: Boolean(data?.is_favorite) };
}

export async function toggleToured(
  token: string,
  propertyKey: string,
  snapshot: WatchedSnapshot = {},
): Promise<{ isToured: boolean }> {
  const data = await apiFetch<{ is_toured?: boolean }>(`${MLS}/watched/toured/toggle/`, {
    method: "POST",
    token,
    body: { property_key: propertyKey, property_snapshot_json: snapshot },
  });
  return { isToured: Boolean(data?.is_toured) };
}

/** Records a view so "Recently Viewed" reflects real browsing. */
export async function addHistory(
  token: string,
  propertyKey: string,
  snapshot: WatchedSnapshot = {},
): Promise<void> {
  await apiFetch(`${MLS}/watched/history/add/`, {
    method: "POST",
    token,
    body: { property_key: propertyKey, property_snapshot_json: snapshot },
  });
}

export async function followArea(
  token: string,
  input: { areaKey: string; areaLabel?: string; areaKind?: string },
): Promise<void> {
  await apiFetch(`${MLS}/watched/areas/follow/`, {
    method: "POST",
    token,
    body: {
      area_key: input.areaKey,
      area_label: input.areaLabel ?? input.areaKey,
      area_kind: input.areaKind ?? "community",
    },
  });
}

export async function unfollowArea(token: string, areaKey: string): Promise<void> {
  await apiFetch(`${MLS}/watched/areas/unfollow/`, {
    method: "POST",
    token,
    body: { area_key: areaKey },
  });
}

export async function updateAlertPreferences(
  token: string,
  prefs: Partial<AlertPreferences>,
): Promise<AlertPreferences> {
  const body: Record<string, boolean> = {};
  const put = (key: string, value: boolean | undefined) => {
    if (typeof value === "boolean") body[key] = value;
  };
  put("price_changes", prefs.priceChanges);
  put("new_listings", prefs.newListings);
  put("status_updates", prefs.statusUpdates);
  put("email_enabled", prefs.emailEnabled);
  put("email_recommend", prefs.emailRecommend);
  put("email_watched_property", prefs.emailWatchedProperty);
  put("email_watched_community", prefs.emailWatchedCommunity);
  put("email_watched_area", prefs.emailWatchedArea);
  put("push_watched_property", prefs.pushWatchedProperty);

  const data = await apiFetch<Record<string, unknown>>(
    `${MLS}/watched/alerts/preferences/`,
    // The backend view only accepts GET / PUT (partial); POST 405s.
    { method: "PUT", token, body },
  );
  return mapPreferences(data);
}

/** Clear helpers backing the "Clear all" affordances in each tab. */
export async function clearCollection(
  token: string,
  collection: "favorites" | "history" | "toured" | "areas",
): Promise<void> {
  // The backend clear views are DELETE-only; POST 405s.
  await apiFetch(`${MLS}/watched/${collection}/clear/`, { method: "DELETE", token });
}

/* -------------------------------------------------------------------------- */
/* Notes — these use `listing_key`                                             */
/* -------------------------------------------------------------------------- */

export async function getPropertyNote(
  token: string,
  listingKey: string,
): Promise<{ body: string; updatedAt: string | null }> {
  const data = await apiFetch<{ body?: string; updated_at?: string }>(
    `${MLS}/property-notes/`,
    { token, params: { listing_key: listingKey } },
  );
  return { body: data?.body ?? "", updatedAt: data?.updated_at ?? null };
}

export interface PropertyNoteEntry {
  listingKey: string;
  body: string;
  updatedAt: string | null;
  createdAt: string | null;
}

/**
 * Every non-empty note the user has written, newest first — the Notes tab.
 * Omitting `listing_key` switches the backend to list mode (GAP-09), which
 * caps the response at 500 rows.
 */
export async function listPropertyNotes(
  token: string,
  options: RequestOptions = {},
): Promise<PropertyNoteEntry[]> {
  const data = await apiFetch<{
    results?: Array<{
      listing_key?: string;
      body?: string;
      updated_at?: string;
      created_at?: string;
    }>;
  }>(`${MLS}/property-notes/`, { ...options, token });
  return (data?.results ?? [])
    .map((note) => ({
      listingKey: note.listing_key ?? "",
      body: note.body ?? "",
      updatedAt: note.updated_at ?? null,
      createdAt: note.created_at ?? null,
    }))
    .filter((note) => note.listingKey && note.body.trim());
}

export async function savePropertyNote(
  token: string,
  listingKey: string,
  body: string,
): Promise<{ body: string; updatedAt: string | null }> {
  const data = await apiFetch<{ body?: string; updated_at?: string }>(
    `${MLS}/property-notes/`,
    { method: "PUT", token, body: { listing_key: listingKey, body } },
  );
  return { body: data?.body ?? body, updatedAt: data?.updated_at ?? null };
}

/* -------------------------------------------------------------------------- */
/* Telemetry                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Fire-and-forget view beacon. `session_key` is required by the serializer and
 * is a client-generated, non-identifying id.
 */
export async function recordListingView(
  listingKey: string,
  sessionKey: string,
  token?: string | null,
  headers?: Record<string, string>,
): Promise<void> {
  await apiFetch(`${MLS}/listing-views/`, {
    method: "POST",
    token,
    headers,
    body: { listing_key: listingKey, session_key: sessionKey },
  });
}

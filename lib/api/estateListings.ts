/**
 * Brokerage-managed listings (estate-properties).
 *
 * These are homes your team adds in Studio — not CREA DDF / MLS® feed rows.
 * Backend: `/api/mls/estate-properties/*`. Staff token required for writes.
 */

import { apiFetch, type RequestOptions } from "@/lib/api/client";
import { toNumber } from "@/lib/utils/format";

const BASE = "/api/mls/estate-properties";

export const LISTING_PUBLISH_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "publish", label: "Published" },
  { value: "pending", label: "Pending review" },
  { value: "private", label: "Private" },
] as const;
export type ListingPublishStatus = (typeof LISTING_PUBLISH_STATUSES)[number]["value"];

export const LISTING_MARKET_STATUSES = [
  { value: "Active", label: "Active / For sale" },
  { value: "Sold", label: "Sold" },
  { value: "Pending", label: "Pending" },
  { value: "Leased", label: "Leased" },
  { value: "Coming Soon", label: "Coming soon" },
] as const;

export const LISTING_PROPERTY_TYPES = [
  "Detached Homes",
  "Semi-Detached",
  "Townhomes",
  "Bungalows",
  "Condo Apartment",
  "Pre Construction",
] as const;

export interface StudioListingSummary {
  id: number;
  listingKey: string;
  title: string;
  address: string | null;
  city: string | null;
  listPrice: number | null;
  publishStatus: string;
  standardStatus: string | null;
  isFeatured: boolean;
  image: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
}

export interface StudioListing extends StudioListingSummary {
  slug: string;
  description: string;
  listingId: string;
  stateOrProvince: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  secondPrice: number | null;
  pricePrefix: string;
  afterPrice: string;
  pricePlaceholder: string;
  enablePricePlaceholder: boolean;
  buildingArea: number | null;
  sizePostfix: string;
  landArea: number | null;
  lotSize: string;
  rooms: number | null;
  garages: number | null;
  garageSize: string;
  yearBuilt: number | null;
  kitchens: number | null;
  taxAnnualAmount: number | null;
  taxYear: number | null;
  basement: string;
  exteriorFeatures: string;
  developer: string;
  customTags: string;
  expiresAt: string | null;
  images: string[];
}

/** Snake_case write payload for the estate-properties API. */
export interface StudioListingInput {
  listing_key?: string;
  property_title?: string;
  property_slug?: string;
  property_description?: string;
  publish_status?: ListingPublishStatus;
  standard_status?: string;
  is_featured?: boolean;
  list_price?: number | null;
  second_price?: number | null;
  price_prefix?: string;
  after_price?: string;
  price_placeholder?: string;
  enable_price_placeholder?: boolean;
  unparsed_address?: string;
  city?: string;
  state_or_province?: string;
  postal_code?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms_total?: number | null;
  bathrooms_total_integer?: number | null;
  rooms?: number | null;
  garages?: number | null;
  garage_size?: string;
  building_area_total?: number | null;
  size_postfix?: string;
  land_area?: number | null;
  lot_size?: string;
  year_built?: number | null;
  kitchens?: number | null;
  tax_annual_amount?: number | null;
  tax_year?: number | null;
  basement?: string;
  exterior_features?: string;
  developer?: string;
  listing_id?: string;
  custom_tags?: string;
  expires_at?: string | null;
  featured_image_url?: string;
  /** Gallery URLs — first becomes the cover. */
  image_urls?: string[];
  /** Taxonomy: property type (stored in wp_terms_json). */
  type?: string | string[];
  status?: string | string[];
}

interface RawEstate {
  id?: number;
  listing_key?: string | null;
  property_title?: string | null;
  property_slug?: string | null;
  property_description?: string | null;
  publish_status?: string | null;
  standard_status?: string | null;
  is_featured?: boolean;
  list_price?: string | number | null;
  second_price?: string | number | null;
  price_prefix?: string | null;
  after_price?: string | null;
  price_placeholder?: string | null;
  enable_price_placeholder?: boolean;
  unparsed_address?: string | null;
  city?: string | null;
  state_or_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  bedrooms_total?: number | null;
  bathrooms_total_integer?: number | null;
  rooms?: number | null;
  garages?: number | null;
  garage_size?: string | null;
  building_area_total?: string | number | null;
  size_postfix?: string | null;
  land_area?: string | number | null;
  lot_size?: string | null;
  year_built?: number | null;
  kitchens?: number | null;
  tax_annual_amount?: string | number | null;
  tax_year?: number | null;
  basement?: string | null;
  exterior_features?: string | null;
  developer?: string | null;
  listing_id?: string | null;
  custom_tags?: string | null;
  expires_at?: string | null;
  featured_image_url?: string | null;
  gallery_images?: Array<{ url?: string }>;
  wp_post_json?: unknown;
  wp_meta_json?: unknown;
  wp_terms_json?: unknown;
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const orNull = (value: unknown): string | null => text(value).trim() || null;

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* ignore */
    }
  }
  return {};
}

function normalizeUrls(value: unknown): string[] {
  const raw: unknown[] = [];
  if (Array.isArray(value)) raw.push(...value);
  else if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) raw.push(...parsed);
      else raw.push(value);
    } catch {
      raw.push(...value.split(","));
    }
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const url =
      typeof item === "string"
        ? item.trim()
        : item && typeof item === "object" && "url" in item
          ? String((item as { url?: unknown }).url ?? "").trim()
          : "";
    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function extractImages(raw: RawEstate): string[] {
  const wpPost = parseJsonObject(raw.wp_post_json);
  const wpMeta = parseJsonObject(raw.wp_meta_json);
  const gallery = Array.isArray(raw.gallery_images)
    ? raw.gallery_images.map((row) => row?.url).filter(Boolean)
    : [];
  return normalizeUrls([
    ...gallery,
    ...normalizeUrls(wpPost.images),
    ...normalizeUrls(wpPost.gallery),
    ...normalizeUrls(wpMeta.gallery_image_urls),
    raw.featured_image_url,
  ]);
}

function firstTerm(raw: RawEstate, key: string): string | null {
  const terms = parseJsonObject(raw.wp_terms_json);
  const value = terms[key];
  if (Array.isArray(value) && value.length) return String(value[0]);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function mapSummary(raw: RawEstate): StudioListingSummary {
  const id = Number(raw.id) || 0;
  const images = extractImages(raw);
  return {
    id,
    listingKey: text(raw.listing_key) || `listing-${id}`,
    title: text(raw.property_title).trim() || text(raw.unparsed_address).trim() || `Listing #${id}`,
    address: orNull(raw.unparsed_address),
    city: orNull(raw.city),
    listPrice: toNumber(raw.list_price),
    publishStatus: text(raw.publish_status) || "draft",
    standardStatus: orNull(raw.standard_status),
    isFeatured: Boolean(raw.is_featured),
    image: images[0] ?? orNull(raw.featured_image_url),
    bedrooms: raw.bedrooms_total ?? null,
    bathrooms: raw.bathrooms_total_integer ?? null,
    propertyType: firstTerm(raw, "type"),
  };
}

export function mapStudioListing(raw: RawEstate): StudioListing {
  const summary = mapSummary(raw);
  return {
    ...summary,
    slug: text(raw.property_slug),
    description: text(raw.property_description),
    listingId: text(raw.listing_id),
    stateOrProvince: text(raw.state_or_province) || "ON",
    postalCode: text(raw.postal_code),
    country: text(raw.country) || "Canada",
    latitude: toNumber(raw.latitude),
    longitude: toNumber(raw.longitude),
    secondPrice: toNumber(raw.second_price),
    pricePrefix: text(raw.price_prefix),
    afterPrice: text(raw.after_price),
    pricePlaceholder: text(raw.price_placeholder),
    enablePricePlaceholder: Boolean(raw.enable_price_placeholder),
    buildingArea: toNumber(raw.building_area_total),
    sizePostfix: text(raw.size_postfix) || "sqft",
    landArea: toNumber(raw.land_area),
    lotSize: text(raw.lot_size),
    rooms: raw.rooms ?? null,
    garages: raw.garages ?? null,
    garageSize: text(raw.garage_size),
    yearBuilt: raw.year_built ?? null,
    kitchens: raw.kitchens ?? null,
    taxAnnualAmount: toNumber(raw.tax_annual_amount),
    taxYear: raw.tax_year ?? null,
    basement: text(raw.basement),
    exteriorFeatures: text(raw.exterior_features),
    developer: text(raw.developer),
    customTags: text(raw.custom_tags),
    expiresAt: raw.expires_at ?? null,
    images: extractImages(raw),
  };
}

export interface StudioListingPage {
  count: number;
  page: number;
  pageSize: number;
  items: StudioListingSummary[];
}

export async function listStudioListings(
  token: string,
  params: {
    search?: string;
    publishStatus?: string;
    page?: number;
    pageSize?: number;
  } = {},
  options: RequestOptions = {},
): Promise<StudioListingPage> {
  const data = await apiFetch<{
    count?: number;
    page?: number;
    page_size?: number;
    results?: RawEstate[];
  }>(`${BASE}/`, {
    ...options,
    token,
    cache: "no-store",
    params: {
      search: params.search || undefined,
      publish_status: params.publishStatus || undefined,
      page: params.page && params.page > 1 ? params.page : undefined,
      page_size: params.pageSize ?? 25,
    },
  });
  return {
    count: data.count ?? 0,
    page: data.page ?? 1,
    pageSize: data.page_size ?? 25,
    items: (data.results ?? []).map(mapSummary),
  };
}

export async function getStudioListing(
  token: string,
  id: number,
  options: RequestOptions = {},
): Promise<StudioListing> {
  const raw = await apiFetch<RawEstate>(`${BASE}/${id}/`, {
    ...options,
    token,
    cache: "no-store",
  });
  return mapStudioListing(raw);
}

/** Public read — no token. Returns null when missing or not published. */
export async function getPublicEstateListing(
  id: number,
  options: RequestOptions = {},
): Promise<StudioListing | null> {
  try {
    const raw = await apiFetch<RawEstate>(`${BASE}/${id}/`, {
      revalidate: 60,
      ...options,
    });
    const listing = mapStudioListing(raw);
    if (listing.publishStatus !== "publish") return null;
    return listing;
  } catch {
    return null;
  }
}

export async function createStudioListing(
  token: string,
  input: StudioListingInput,
): Promise<StudioListing> {
  const raw = await apiFetch<RawEstate>(`${BASE}/`, {
    method: "POST",
    token,
    body: input,
  });
  return mapStudioListing(raw);
}

export async function updateStudioListing(
  token: string,
  id: number,
  input: StudioListingInput,
): Promise<StudioListing> {
  const raw = await apiFetch<RawEstate>(`${BASE}/${id}/`, {
    method: "PATCH",
    token,
    body: input,
  });
  return mapStudioListing(raw);
}

export async function deleteStudioListing(token: string, id: number): Promise<void> {
  await apiFetch<void>(`${BASE}/${id}/`, { method: "DELETE", token });
}

export async function uploadListingMedia(
  token: string,
  form: FormData,
): Promise<{ url: string }> {
  const raw = await apiFetch<{ results?: Array<{ url?: string }> }>(`${BASE}/media-upload/`, {
    method: "POST",
    token,
    body: form,
    timeoutMs: 60_000,
  });
  const url = raw.results?.[0]?.url;
  if (!url) throw new Error("Upload succeeded but no image URL was returned.");
  return { url };
}

/** Stable listing key when the client leaves the field blank. */
export function generateListingKey(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HA-${stamp}-${rand}`;
}

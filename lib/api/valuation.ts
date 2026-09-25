/**
 * Home valuation — the seller funnel.
 *
 * Backed by a real engine in mls-v2 (`mls/services/valuation/`): comparable
 * selection, a hedonic adjustment model, a 30-day trend multiplier and agent
 * matching. Nothing here is simulated.
 */

import { apiFetch, type RequestOptions } from "@/lib/api/client";
import { toNumber } from "@/lib/utils/format";
import type {
  BackendValuationEstimate,
  BackendValuationSuggestion,
} from "@/lib/types/backend";

const MLS = "/api/mls";

export interface AddressSuggestion {
  label: string;
  listingKey: string | null;
  latitude: number | null;
  longitude: number | null;
  fsa: string | null;
}

/** Subject-property payload returned by `valuation/lookup/`. */
export interface ValuationSubject {
  listingKey: string | null;
  address: string;
  city: string;
  cityRegion: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  bedroomsTotal: number | null;
  bathroomsTotal: number | null;
  livingArea: number | null;
  parkingTotal: number | null;
  taxAnnualAmount: number | null;
  propertySubType: string;
  lotFrontage: number | null;
  lotDepth: number | null;
}

/**
 * One column of the AVM report table (scope #10). Every field is null when
 * the feed does not carry it; the table renders a dash.
 */
export interface AvmDetails {
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  propertyStyle: string | null;
  propertyType: string | null;
  frontageFt: number | null;
  depthFt: number | null;
  lotArea: number | null;
  lotAreaUnits: string | null;
  yearBuilt: number | null;
  floorAreaSqft: number | null;
  basement: string | null;
  storeys: number | null;
  bedrooms: number | null;
  bedroomsBelowGrade: number | null;
  bathroomsFull: number | null;
  bathroomsHalf: number | null;
  fireplaces: number | null;
  heating: string | null;
  airConditioning: boolean | null;
  pool: boolean | null;
  parkingTotal: number | null;
  parkingFeatures: string | null;
  taxAnnualAmount: number | null;
}

/**
 * `sold_proxy`: a listing that left the market; its price is the LAST ASKING
 * price, not a confirmed sale price (the backend has no sold prices for
 * comps). `active_listing`: currently for sale.
 */
export type CompSource = "sold_proxy" | "active_listing";

export interface ValuationComp {
  listingKey: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  livingArea: number | null;
  address: string;
  city: string;
  distanceKm: number | null;
  source: CompSource | null;
  /** Off-market date for a sold proxy; listed date for an active comp. */
  eventDate: string | null;
  details: AvmDetails;
}

export interface ValuationResult {
  low: number;
  market: number;
  high: number;
  quickSaleLow: number;
  quickSaleHigh: number;
  trendPct30d: number;
  comps: ValuationComp[];
  confidence: string | null;
  /** 0-5, derived by the backend from the model's confidence band. */
  confidenceStars: number;
  valuationDate: string | null;
  subjectDetails: AvmDetails;
  /** True when too few comparables were found for a reliable estimate. */
  sparse: boolean;
  /** The backend always flags this model as beta; surface it in the UI. */
  beta: boolean;
  agentName: string | null;
  message: string | null;
}

/** Minimum characters before the backend will answer (enforced server-side). */
export const AUTOCOMPLETE_MIN_CHARS = 2;

export async function autocompleteAddress(
  query: string,
  options: RequestOptions = {},
): Promise<AddressSuggestion[]> {
  if (query.trim().length < AUTOCOMPLETE_MIN_CHARS) return [];

  const data = await apiFetch<{ results: BackendValuationSuggestion[] }>(
    `${MLS}/valuation/autocomplete/`,
    { ...options, params: { q: query.trim() } },
  );

  return (data.results ?? []).map((item) => ({
    label: item.label,
    listingKey: item.listing_key ?? null,
    latitude: typeof item.latitude === "number" ? item.latitude : null,
    longitude: typeof item.longitude === "number" ? item.longitude : null,
    fsa: typeof item.fsa === "string" ? item.fsa : null,
  }));
}

export async function lookupSubject(
  input: { listingKey?: string; address?: string },
  options: RequestOptions = {},
): Promise<ValuationSubject> {
  const raw = await apiFetch<Record<string, unknown>>(`${MLS}/valuation/lookup/`, {
    ...options,
    params: { listing_key: input.listingKey, address: input.address },
  });

  const num = (value: unknown) => (typeof value === "number" ? value : null);

  return {
    listingKey: (raw.listing_key as string) ?? null,
    address: (raw.unparsed_address as string) ?? "",
    city: (raw.city as string) ?? "",
    cityRegion: (raw.city_region as string) ?? "",
    postalCode: (raw.postal_code as string) ?? "",
    latitude: num(raw.latitude),
    longitude: num(raw.longitude),
    bedroomsTotal: num(raw.bedrooms_total),
    bathroomsTotal: num(raw.bathrooms_total),
    livingArea: num(raw.living_area) ?? num(raw.above_grade_finished_area),
    parkingTotal: num(raw.parking_total),
    taxAnnualAmount: num(raw.tax_annual_amount),
    propertySubType: (raw.property_sub_type as string) ?? "",
    lotFrontage: num(raw.lot_frontage),
    lotDepth: num(raw.lot_depth),
  };
}

export interface EstimateInput {
  listingKey?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  postalCode?: string;
  city?: string;
  propertySubType?: string;
  bedroomsTotal?: number | null;
  bathroomsTotal?: number | null;
  livingArea?: number | null;
  parkingTotal?: number | null;
  lotFrontage?: number | null;
  lotDepth?: number | null;
}

export async function estimateValue(
  input: EstimateInput,
  options: RequestOptions = {},
): Promise<ValuationResult> {
  const data = await apiFetch<BackendValuationEstimate & { confidence?: string }>(
    `${MLS}/valuation/estimate/`,
    {
      ...options,
      method: "POST",
      body: {
        listing_key: input.listingKey ?? undefined,
        latitude: input.latitude ?? undefined,
        longitude: input.longitude ?? undefined,
        postal_code: input.postalCode,
        city: input.city,
        property_sub_type: input.propertySubType,
        bedrooms_total: input.bedroomsTotal ?? undefined,
        bathrooms_total: input.bathroomsTotal ?? undefined,
        living_area: input.livingArea ?? undefined,
        parking_total: input.parkingTotal ?? undefined,
        lot_frontage: input.lotFrontage ?? undefined,
        lot_depth: input.lotDepth ?? undefined,
      },
    },
  );

  const agent = data.agent as Record<string, unknown> | null;

  return {
    low: data.estimate?.low ?? 0,
    market: data.estimate?.market ?? 0,
    high: data.estimate?.high ?? 0,
    quickSaleLow: data.estimate?.quick_sale_low ?? 0,
    quickSaleHigh: data.estimate?.quick_sale_high ?? 0,
    trendPct30d: Number(data.trend?.pct_30d ?? 0) * 100,
    comps: (data.comps ?? []).map((comp) => ({
      listingKey: (comp.listing_key as string) ?? null,
      price: typeof comp.price === "number" ? comp.price : null,
      beds: typeof comp.bedrooms_total === "number" ? comp.bedrooms_total : null,
      baths:
        typeof comp.bathrooms_total_integer === "number"
          ? comp.bathrooms_total_integer
          : null,
      livingArea: typeof comp.living_area === "number" ? comp.living_area : null,
      address: (comp.unparsed_address as string) ?? "",
      city: (comp.city as string) ?? "",
      distanceKm: typeof comp.distance_km === "number" ? comp.distance_km : null,
      source: comp.source === "sold_proxy" || comp.source === "active_listing" ? comp.source : null,
      eventDate: typeof comp.event_date === "string" ? comp.event_date : null,
      details: mapAvmDetails(comp.details),
    })),
    confidence: (data.confidence as string) ?? null,
    confidenceStars: typeof data.confidence_stars === "number" ? data.confidence_stars : 0,
    valuationDate: typeof data.valuation_date === "string" ? data.valuation_date : null,
    subjectDetails: mapAvmDetails(data.subject_details),
    sparse: Boolean(data.sparse),
    beta: Boolean(data.beta),
    agentName:
      (agent?.name as string) ??
      (agent?.full_name as string) ??
      null,
    // Present when the backend could not geolocate the subject property.
    message: data.detail ?? null,
  };
}

export function mapAvmDetails(raw: unknown): AvmDetails {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (value: unknown) => toNumber(value);
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
  const bool = (value: unknown) => (typeof value === "boolean" ? value : null);
  return {
    address: text(row.address),
    city: text(row.city),
    province: text(row.province),
    postalCode: text(row.postal_code),
    propertyStyle: text(row.property_style),
    propertyType: text(row.property_type),
    frontageFt: num(row.frontage_ft),
    depthFt: num(row.depth_ft),
    lotArea: num(row.lot_area),
    lotAreaUnits: text(row.lot_area_units),
    yearBuilt: num(row.year_built),
    floorAreaSqft: num(row.floor_area_sqft),
    basement: text(row.basement),
    storeys: num(row.storeys),
    bedrooms: num(row.bedrooms),
    bedroomsBelowGrade: num(row.bedrooms_below_grade),
    bathroomsFull: num(row.bathrooms_full),
    bathroomsHalf: num(row.bathrooms_half),
    fireplaces: num(row.fireplaces),
    heating: text(row.heating),
    airConditioning: bool(row.air_conditioning),
    pool: bool(row.pool),
    parkingTotal: num(row.parking_total),
    parkingFeatures: text(row.parking_features),
    taxAnnualAmount: num(row.tax_annual_amount),
  };
}

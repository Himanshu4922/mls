/**
 * Translation layer: mls-v2 RESO payloads → HomeAtlas UI domain objects.
 *
 * All backend-shape knowledge lives here. Components never read RESO field
 * names directly, so a backend change is a one-file fix.
 *
 * Documented in docs/02-MAPPING.md. Where the backend cannot supply a field the
 * mapper returns null and the UI shows an unavailable state — it never guesses.
 */

import type {
  BackendMedia,
  BackendPropertyDetail,
  BackendPropertySummary,
  BackendPropertyTypeFacet,
  BackendUserProfile,
} from "@/lib/types/backend";
import type {
  AuthUser,
  PropertyBadge,
  PropertyDetail,
  PropertyFact,
  PropertyImage,
  PropertyStatus,
  PropertySummary,
  PropertyTypeFacet,
  UiPropertyType,
} from "@/lib/types/domain";
import {
  daysSince,
  splitFeatures,
  titleCase,
  toNumber,
  formatNumber,
  formatPrice,
} from "@/lib/utils/format";

/* -------------------------------------------------------------------------- */
/* Property type normalization                                                */
/* -------------------------------------------------------------------------- */

/**
 * RESO `property_sub_type` is free text from the DDF feed ("Single Family",
 * "Att/Row/Townhouse", "Condo Apartment", …). The reference UI filters on six
 * canonical types, so we map onto those where possible and otherwise pass the
 * raw label through rather than dropping the listing from view.
 */
const TYPE_PATTERNS: Array<{ test: RegExp; type: UiPropertyType }> = [
  { test: /semi[-\s]?detached/i, type: "Semi-Detached" },
  { test: /town\s?(house|home)|att\/row|row\s?house|freehold town/i, type: "Townhome" },
  { test: /condo|apartment|co-?op|loft/i, type: "Condo" },
  { test: /detached|single\s?family|house/i, type: "Detached" },
  { test: /lease|rental|rent/i, type: "Rental" },
];

export function normalizePropertyType(raw: string | null | undefined): {
  label: string | null;
  uiType: UiPropertyType | null;
} {
  if (!raw || !raw.trim()) return { label: null, uiType: null };
  const value = raw.trim();
  for (const { test, type } of TYPE_PATTERNS) {
    if (test.test(value)) return { label: type, uiType: type };
  }
  return { label: titleCase(value), uiType: null };
}

/**
 * Home type from `structure_type` (+ attached flag) when the feed has it, else
 * from `property_sub_type`. Needed because the sub-type is "Single Family" for
 * condos and houses alike, which labelled every apartment "Detached".
 */
export function resolvePropertyType(
  subType: string | null | undefined,
  structureType: string | null | undefined,
  attached: boolean | null | undefined,
): { label: string | null; uiType: UiPropertyType | null } {
  const structure = (structureType ?? "").trim().toLowerCase();
  if (structure === "apartment") return { label: "Condo", uiType: "Condo" };
  if (structure.startsWith("row")) return { label: "Townhome", uiType: "Townhome" };
  if (structure === "house") {
    return attached ? { label: "Semi-Detached", uiType: "Semi-Detached" } : { label: "Detached", uiType: "Detached" };
  }
  return normalizePropertyType(subType);
}

/** Maps a UI type back to a regex for client-side filtering (see API_GAPS G1). */
export function matchesUiType(raw: string | null | undefined, uiType: string): boolean {
  const { label } = normalizePropertyType(raw);
  return (label ?? "").toLowerCase() === uiType.toLowerCase();
}

/* -------------------------------------------------------------------------- */
/* Status                                                                      */
/* -------------------------------------------------------------------------- */

export function normalizeStatus(raw: string | null | undefined): PropertyStatus {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return "other";
  if (value === "active" || value.startsWith("active")) return "active";
  if (value === "sold" || value === "closed") return "sold";
  if (value === "leased" || value === "rented") return "leased";
  return "other";
}

export function statusLabel(status: PropertyStatus): string {
  switch (status) {
    case "active":
      return "For Sale";
    case "sold":
      return "Sold";
    case "leased":
      return "Leased";
    default:
      return "Off Market";
  }
}

/* -------------------------------------------------------------------------- */
/* Badges                                                                      */
/* -------------------------------------------------------------------------- */

const NEW_LISTING_DAYS = 7;
/** A price cut is only worth badging once it is a real move, not a rounding. */
const PRICE_DROP_MIN_PCT = 1;

/**
 * Open House and Price Drop are now derivable: mls-v2 exposes `next_open_house`
 * (G6) and `previous_list_price` / `price_change_timestamp` (G7). Both are still
 * optional on the payload, so every read is guarded — an older backend simply
 * yields no badge rather than a crash.
 *
 * Order is by usefulness to a buyer scanning a grid: a scheduled visit beats a
 * price cut, which beats "new", which beats a brokerage marketing flag.
 */
function deriveBadge(
  raw: BackendPropertySummary,
  status: PropertyStatus,
): PropertyBadge | null {
  if (status === "sold") return { label: "Sold", tone: "sold" };

  if (isUpcomingOpenHouse(raw.next_open_house)) {
    return { label: "Open House", tone: "openHouse" };
  }

  const drop = priceDropPercent(raw);
  if (drop !== null && drop >= PRICE_DROP_MIN_PCT) {
    return { label: `Price Drop ${Math.round(drop)}%`, tone: "priceDrop" };
  }

  const age = daysSince(raw.original_entry_timestamp ?? raw.modification_timestamp ?? null);
  if (age !== null && age <= NEW_LISTING_DAYS) {
    return { label: "New", tone: "new" };
  }

  const category = (raw.category_type ?? "").toLowerCase();
  if (category.includes("exclusive")) return { label: "Exclusive", tone: "exclusive" };
  if (raw.is_featured) return { label: "Featured", tone: "featured" };

  return null;
}

/** True when the feed carries an open house whose END is still in the future. */
function isUpcomingOpenHouse(
  event: BackendPropertySummary["next_open_house"],
): boolean {
  const end = event?.end ?? event?.start;
  if (!end) return false;
  const ends = Date.parse(end);
  return Number.isFinite(ends) && ends >= Date.now();
}

/**
 * Percentage cut from the previous list price, or null when there was no cut.
 * Increases return null — an upward revision is not a "price drop".
 */
function priceDropPercent(raw: BackendPropertySummary): number | null {
  const previous = toNumber(raw.previous_list_price);
  const current = toNumber(raw.list_price);
  if (!previous || !current || previous <= 0 || current <= 0) return null;
  if (current >= previous) return null;
  return ((previous - current) / previous) * 100;
}

/* -------------------------------------------------------------------------- */
/* Media                                                                       */
/* -------------------------------------------------------------------------- */

function summaryImage(raw: BackendPropertySummary): string | null {
  const url = raw.media?.media_url?.trim();
  return url ? url : null;
}

function mapImages(media: BackendMedia[] | undefined): PropertyImage[] {
  if (!Array.isArray(media)) return [];
  return media
    .map((m) => ({
      url: (m.url || m.media_url || "")?.trim() ?? "",
      category: m.media_category ?? null,
      isPreferred: Boolean(m.is_preferred),
    }))
    .filter((m) => m.url.length > 0)
    // Preferred photo leads the gallery, then feed order.
    .sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred));
}

/* -------------------------------------------------------------------------- */
/* Summary                                                                     */
/* -------------------------------------------------------------------------- */

export function mapPropertySummary(raw: BackendPropertySummary): PropertySummary {
  const status = normalizeStatus(raw.standard_status);
  const listPrice = toNumber(raw.list_price);
  // Monthly rent. DDF puts it in total_actual_rent for most rentals (1,172 of
  // 1,215) and in lease_amount for the rest; list_price is null for both.
  const leaseAmount = toNumber(raw.lease_amount) ?? toNumber(raw.total_actual_rent);
  const isLease = (!listPrice || listPrice <= 0) && Boolean(leaseAmount && leaseAmount > 0);
  const { label, uiType } = resolvePropertyType(raw.property_sub_type, raw.structure_type, raw.property_attached_yn);

  // building_area_total is the RESO primary; some feeds only populate the
  // finished-area variants, so fall through rather than showing nothing.
  const sqft =
    toNumber(raw.building_area_total) ??
    toNumber(raw.living_area) ??
    toNumber(raw.above_grade_finished_area);

  return {
    id: raw.listing_key,
    address: raw.unparsed_address?.trim() || "Address not disclosed",
    neighbourhood: raw.city_region?.trim() || raw.subdivision_name?.trim() || null,
    community: raw.city?.trim() || null,
    price: isLease ? leaseAmount : listPrice,
    isLease,
    beds: raw.bedrooms_total ?? null,
    baths: raw.bathrooms_total_integer ?? null,
    type: isLease && !uiType ? "Rental" : label,
    uiType: isLease ? "Rental" : uiType,
    sqft: sqft && sqft > 0 ? sqft : null,
    status,
    badge: deriveBadge(raw, status),
    mls: raw.listing_id?.trim() || raw.listing_key,
    image: summaryImage(raw),
    photosCount: raw.photos_count ?? 0,
    latitude: toNumber(raw.latitude),
    longitude: toNumber(raw.longitude),
    postalCode: raw.postal_code?.trim() || null,
    yearBuilt: raw.year_built ?? null,
    description: raw.public_remarks?.trim() || null,
    statusChangedAt: raw.status_change_timestamp ?? null,
    listedAt: raw.original_entry_timestamp ?? null,
    closePrice: toNumber(raw.close_price),
    closeDate: raw.close_date ?? null,
    previousListPrice: toNumber(raw.previous_list_price),
    priceChangedAt: raw.price_change_timestamp ?? null,
    nextOpenHouse:
      raw.next_open_house?.start
        ? { start: raw.next_open_house.start, end: raw.next_open_house.end ?? null }
        : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Detail                                                                      */
/* -------------------------------------------------------------------------- */

function fact(label: string, value: string | number | null | undefined): PropertyFact | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text === "0") return null;
  return { label, value: text };
}

function group(title: string, facts: Array<PropertyFact | null>) {
  const kept = facts.filter((f): f is PropertyFact => f !== null);
  return kept.length > 0 ? { title, facts: kept } : null;
}

export function mapPropertyDetail(raw: BackendPropertyDetail): PropertyDetail {
  const summary = mapPropertySummary(raw as unknown as BackendPropertySummary);
  const images = mapImages(raw.media);

  const livingArea = toNumber(raw.living_area);
  const taxAnnual = toNumber(raw.tax_annual_amount);
  const assocFee = toNumber(raw.association_fee);
  const lotFrontage = toNumber(raw.frontage_length_numeric);

  const factGroups = [
    group("Property details", [
      fact("Property type", summary.type),
      fact("Year built", raw.year_built),
      fact("Stories", raw.stories),
      fact("Architectural style", titleCase(raw.architectural_style)),
      fact("Condition", titleCase(raw.property_condition)),
      fact("Living area", livingArea ? `${formatNumber(livingArea)} sq ft` : null),
      fact("Lot size", raw.lot_size_dimensions),
      fact("Lot frontage", lotFrontage ? `${formatNumber(lotFrontage)} ft` : null),
    ]),
    group("Interior", [
      fact("Bedrooms", raw.bedrooms_total),
      fact("Bathrooms", raw.bathrooms_total_integer),
      fact("Partial baths", raw.bathrooms_partial),
      fact("Basement", titleCase(raw.basement)),
      fact("Heating", titleCase(raw.heating)),
      fact("Cooling", titleCase(raw.cooling)),
      fact("Flooring", titleCase(raw.flooring)),
      fact("Fireplaces", raw.fireplaces_total),
    ]),
    group("Exterior & parking", [
      fact("Parking spaces", raw.parking_total),
      fact("Parking features", titleCase(raw.parking_features)),
      fact("Construction", titleCase(raw.construction_materials)),
      fact("Roof", titleCase(raw.roof)),
      fact("Pool", titleCase(raw.pool_features)),
      fact("View", titleCase(raw.view)),
      fact("Waterfront", titleCase(raw.waterfront_features)),
    ]),
    group("Financial", [
      fact("Annual taxes", taxAnnual ? formatPrice(taxAnnual) : null),
      fact(
        "Maintenance fee",
        assocFee
          ? `${formatPrice(assocFee)}${raw.association_fee_frequency ? ` / ${raw.association_fee_frequency.toLowerCase()}` : ""}`
          : null,
      ),
      fact("Fee includes", titleCase(raw.association_fee_includes)),
    ]),
  ].filter((g): g is { title: string; facts: PropertyFact[] } => g !== null);

  return {
    ...summary,
    // Detail carries the full media array; prefer it over the summary's single image.
    image: images[0]?.url ?? summary.image,
    images,
    rooms: (raw.rooms ?? [])
      .map((r) => ({
        name: titleCase(r.room_type),
        level: titleCase(r.room_level),
        dimensions:
          r.room_dimensions?.trim() ||
          (r.room_length && r.room_width ? `${r.room_length} × ${r.room_width}` : null),
      }))
      .filter((r) => r.name !== null),
    unitNumber: raw.unit_number?.trim() || null,
    stateOrProvince: raw.state_or_province?.trim() || null,
    lotFrontage,
    lotSizeDimensions: raw.lot_size_dimensions?.trim() || null,
    parkingTotal: raw.parking_total ?? null,
    taxAnnualAmount: taxAnnual,
    associationFee: assocFee,
    associationFeeFrequency: raw.association_fee_frequency?.trim() || null,
    factGroups,
  };
}

/** Amenity/feature chips shown on the detail page. */
export function collectFeatures(raw: BackendPropertyDetail): string[] {
  return [
    ...splitFeatures(raw.interior_features),
    ...splitFeatures(raw.exterior_features),
    ...splitFeatures(raw.community_features),
    ...splitFeatures(raw.appliances),
  ].slice(0, 24);
}

/* -------------------------------------------------------------------------- */
/* Facets & user                                                               */
/* -------------------------------------------------------------------------- */

export function mapPropertyTypeFacet(raw: BackendPropertyTypeFacet): PropertyTypeFacet {
  const { label, uiType } = normalizePropertyType(raw.value);
  return {
    value: raw.value,
    label: label ?? raw.label,
    count: raw.count,
    uiType,
  };
}

export function mapUser(raw: BackendUserProfile): AuthUser {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    phoneVerified: raw.phone_verified,
    avatar: raw.avatar,
    // Default to false: an unknown flag must never open a privileged door.
    canUseStudio: Boolean(raw.can_use_studio ?? (raw.is_staff || raw.can_author)),
    isStaff: Boolean(raw.is_staff),
  };
}

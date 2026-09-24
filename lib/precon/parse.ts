/**
 * Parsers for the pre-con detail payload's `meta` dictionary.
 *
 * `meta` is free-form key/value text written by the Django admin and the
 * WordPress importer (keys documented in mls-v2 `mls/admin.py`). None of it is
 * validated on write, so every parser here treats its input as untrusted: a
 * malformed JSON blob or a wrong-shaped item yields an empty list, never a
 * thrown error that would take the whole page down.
 *
 * Ported from mls-v2 `precon-listings/[id]/page.tsx`, loosened where the old
 * type guards dropped a whole row for one numeric field (e.g. a home
 * collection whose `bedrooms` was written as 3 rather than "3").
 */

export type PreconMeta = Record<string, string>;

export interface DepositInstallment {
  milestone: string;
  amount: string | null;
  percentage: string | null;
}

export interface DepositPlan {
  title: string;
  installments: DepositInstallment[];
}

export interface NearbyPlace {
  name: string;
  category: string | null;
  travelTime: string | null;
}

export interface LabelValue {
  label: string;
  value: string;
}

export interface HomeCollection {
  name: string;
  homeType: string | null;
  bedrooms: string | null;
  bathrooms: string | null;
  area: string | null;
  startingPrice: string | null;
}

export interface PreconDocuments {
  floorPlan: boolean;
  priceList: boolean;
  brochure: boolean;
}

export interface PreconAttachment {
  url: string;
  title: string | null;
  mimeType: string | null;
}

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */

/** Coerces the raw `meta` object to string values; anything else becomes {}. */
export function toMeta(raw: unknown): PreconMeta {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const meta: PreconMeta = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") meta[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) meta[key] = String(value);
  }
  return meta;
}

/** Trimmed text, or null when empty / not text-like. */
export function text(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/** JSON array from a meta string; malformed or non-array JSON yields []. */
export function parseJsonArray(value: string | null | undefined): unknown[] {
  if (!value?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function record(item: unknown): Record<string, unknown> | null {
  return item && typeof item === "object" && !Array.isArray(item)
    ? (item as Record<string, unknown>)
    : null;
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}

/** Delimited meta list (`incentives` uses "|", `property_types` ","), deduped. */
export function splitList(value: string | null | undefined, separator: string | RegExp): string[] {
  if (!value) return [];
  return unique(
    value
      .split(separator)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

/** A `*_json` string array. */
export function parseStringList(value: string | null | undefined): string[] {
  return unique(
    parseJsonArray(value)
      .map((item) => text(item))
      .filter((item): item is string => item !== null),
  );
}

/* -------------------------------------------------------------------------- */
/* Structured lists                                                            */
/* -------------------------------------------------------------------------- */

const PERCENT_ONLY = /^\d+(?:\.\d+)?\s*%$/;

function installment(item: unknown): DepositInstallment | null {
  const row = record(item);
  if (!row) return null;
  const milestone = text(row.milestone) ?? text(row.label) ?? text(row.due);
  if (!milestone) return null;
  let amount = text(row.amount);
  let percentage = text(row.percentage) ?? text(row.percent);
  // Authors often put "5%" in `amount`; show it in the % column instead.
  if (amount && !percentage && PERCENT_ONLY.test(amount)) {
    percentage = amount;
    amount = null;
  }
  if (percentage && /^\d+(?:\.\d+)?$/.test(percentage)) percentage = `${percentage}%`;
  return { milestone, amount, percentage };
}

/**
 * `deposit_plans_json` → plans. Falls back to `deposit_structure` (steps split
 * on ";") as a single untitled plan when the JSON is missing or unusable.
 */
export function parseDepositPlans(
  json: string | null | undefined,
  fallbackStructure?: string | null,
): DepositPlan[] {
  const plans = parseJsonArray(json)
    .map((item, index): DepositPlan | null => {
      const row = record(item);
      if (!row || !Array.isArray(row.installments)) return null;
      const installments = row.installments
        .map(installment)
        .filter((step): step is DepositInstallment => step !== null);
      if (installments.length === 0) return null;
      return { title: text(row.title) ?? `Deposit plan ${index + 1}`, installments };
    })
    .filter((plan): plan is DepositPlan => plan !== null);

  if (plans.length > 0) return plans;

  const steps = splitList(fallbackStructure, ";");
  if (steps.length === 0) return [];
  return [
    {
      title: "Deposit structure",
      installments: steps.map((step) => ({ milestone: step, amount: null, percentage: null })),
    },
  ];
}

export function parseNearbyPlaces(value: string | null | undefined): NearbyPlace[] {
  return parseJsonArray(value)
    .map((item): NearbyPlace | null => {
      const row = record(item);
      const name = row ? text(row.name) : null;
      if (!row || !name) return null;
      return {
        name,
        category: text(row.category),
        travelTime: text(row.travel_time) ?? text(row.travelTime),
      };
    })
    .filter((place): place is NearbyPlace => place !== null);
}

export function parseLabelValues(value: string | null | undefined): LabelValue[] {
  return parseJsonArray(value)
    .map((item): LabelValue | null => {
      const row = record(item);
      const label = row ? text(row.label) : null;
      const val = row ? text(row.value) : null;
      return label && val ? { label, value: val } : null;
    })
    .filter((row): row is LabelValue => row !== null);
}

export function parseHomeCollections(value: string | null | undefined): HomeCollection[] {
  return parseJsonArray(value)
    .map((item): HomeCollection | null => {
      const row = record(item);
      const name = row ? text(row.name) : null;
      if (!row || !name) return null;
      return {
        name,
        homeType: text(row.home_type),
        bedrooms: text(row.bedrooms),
        bathrooms: text(row.bathrooms),
        area: text(row.area),
        startingPrice: text(row.starting_price),
      };
    })
    .filter((row): row is HomeCollection => row !== null);
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

function formatAmount(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(number)) return text(value);
  return number.toLocaleString("en-CA", { maximumFractionDigits: 1 });
}

/** "1–3" from min/max meta, else the single fallback column, else null. */
export function formatRange(
  minimum: string | null | undefined,
  maximum: string | null | undefined,
  fallback?: string | number | null,
): string | null {
  const min = formatAmount(minimum);
  const max = formatAmount(maximum);
  if (min && max) return min === max ? min : `${min}–${max}`;
  return min ?? max ?? formatAmount(fallback);
}

/**
 * The WordPress body repeats, as headings, sections the page renders from
 * structured meta. Keep only the prose before the first such heading so the
 * deposit table and incentives are not shown twice.
 */
export function getOverviewHtml(body: string | null | undefined): string {
  if (!body?.trim()) return "";
  const match =
    /<h[2-6][^>]*>\s*(Project Highlights|Deposit Structure|Purchaser Incentives|Location and Amenities)/i.exec(
      body,
    );
  if (!match || match.index <= 0) return body;
  return body.slice(0, match.index).trim();
}

/* -------------------------------------------------------------------------- */
/* Attachments                                                                 */
/* -------------------------------------------------------------------------- */

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|avif)$/i;

/**
 * Images feed the gallery; everything else (PDFs, spreadsheets) is a document.
 * A PDF handed to next/image fails the optimiser and renders a broken tile.
 */
export function splitAttachments(raw: unknown): {
  images: string[];
  documents: PreconAttachment[];
} {
  const images: string[] = [];
  const documents: PreconAttachment[] = [];
  if (!Array.isArray(raw)) return { images, documents };

  for (const item of raw) {
    const row = record(item);
    if (!row) continue;
    const url = text(row.url) ?? text(row.source_url);
    if (!url) continue;
    const mimeType = text(row.mime_type)?.toLowerCase() ?? null;
    const isImage = mimeType
      ? mimeType.startsWith("image/")
      : IMAGE_EXTENSION.test(url.split("?")[0]);
    if (isImage) images.push(url);
    else documents.push({ url, title: text(row.title), mimeType });
  }
  return { images: unique(images), documents };
}

/* -------------------------------------------------------------------------- */
/* Whole-meta mapping                                                          */
/* -------------------------------------------------------------------------- */

export interface PreconMetaFields {
  occupancy: string | null;
  priceDisplay: string | null;
  bedroomRange: string | null;
  bathroomRange: string | null;
  areaRange: string | null;
  areaUnit: string;
  garageCount: string | null;
  propertyTypes: string[];
  propertyStyle: string | null;
  location: string | null;
  depositTotal: string | null;
  incentives: string[];
  amenities: string[];
  depositPlans: DepositPlan[];
  communityHighlights: string[];
  interiorFeatures: string[];
  exteriorFeatures: string[];
  nearbyPlaces: NearbyPlace[];
  buyerInformation: LabelValue[];
  homeCollections: HomeCollection[];
  purchaseNotes: string[];
  seoTitle: string | null;
  seoDescription: string | null;
}

/**
 * Typed view of `meta`. Column values (`bedrooms`, `area`, `garages`) are the
 * fallbacks when the range keys are absent.
 *
 * Deliberately ignored: `project_status`, `sales_status`, `construction_status`,
 * `listing_badge`, `availability_label` — the WP importer fills them with demo
 * placeholders, not real data.
 */
export function parsePreconMeta(
  meta: PreconMeta,
  columns: { bedrooms?: number | null; bathrooms?: number | null; area?: number | null; garages?: number | null } = {},
): PreconMetaFields {
  const location =
    text(meta.location_display) ??
    ([text(meta.city), text(meta.province)].filter(Boolean).join(", ") || null);
  const depositTotal = text(meta.deposit_total_percentage);

  return {
    occupancy: text(meta.occupancy_year) ?? text(meta.estimated_completion),
    priceDisplay: text(meta.price_display),
    bedroomRange: formatRange(meta.bedrooms_min, meta.bedrooms_max, columns.bedrooms),
    bathroomRange: formatRange(meta.bathrooms_min, meta.bathrooms_max, columns.bathrooms),
    areaRange: formatRange(meta.area_min, meta.area_max, columns.area),
    areaUnit: text(meta.area_unit) ?? "sq ft",
    garageCount: formatAmount(text(meta.garage_count) ?? columns.garages),
    propertyTypes: splitList(meta.property_types, ","),
    propertyStyle: text(meta.property_style),
    location,
    depositTotal:
      depositTotal && /^\d+(?:\.\d+)?$/.test(depositTotal) ? `${depositTotal}%` : depositTotal,
    incentives: splitList(meta.incentives, "|"),
    amenities: splitList(meta.amenities, "|"),
    depositPlans: parseDepositPlans(meta.deposit_plans_json, meta.deposit_structure),
    communityHighlights: parseStringList(meta.community_highlights_json),
    interiorFeatures: parseStringList(meta.interior_features_json),
    exteriorFeatures: parseStringList(meta.exterior_features_json),
    nearbyPlaces: parseNearbyPlaces(meta.nearby_places_json),
    buyerInformation: parseLabelValues(meta.buyer_information_json),
    homeCollections: parseHomeCollections(meta.home_collections_json),
    purchaseNotes: parseStringList(meta.purchase_notes_json),
    seoTitle: text(meta.seo_title),
    seoDescription: text(meta.seo_description),
  };
}

/**
 * Document availability. Prefers the backend's `has_*` flags (the URLs are
 * stripped from `meta` once those exist); an older backend still sends the
 * meta URLs, so their presence is the fallback signal.
 */
export function parseDocuments(
  raw: { has_floor_plan?: unknown; has_price_list?: unknown; has_brochure?: unknown },
  meta: PreconMeta,
): PreconDocuments {
  const flag = (value: unknown, metaKey: string) =>
    typeof value === "boolean" ? value : Boolean(text(meta[metaKey]));
  return {
    floorPlan: flag(raw.has_floor_plan, "floor_plan_url"),
    priceList: flag(raw.has_price_list, "price_list_url"),
    brochure: flag(raw.has_brochure, "brochure_url"),
  };
}

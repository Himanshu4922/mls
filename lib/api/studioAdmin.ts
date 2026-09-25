/**
 * Staff Studio (scope #2d): pre-con project editing and listing-submission
 * review, over mls-v2's `/api/mls/studio/*`. Staff-only on both sides; like
 * `lib/api/studio.ts`, every call takes an explicit token because these run
 * server-side inside the `/api/studio/*` proxy routes.
 */

import { apiFetch, type RequestOptions } from "@/lib/api/client";
import type { PreconSalesStage } from "@/lib/api/preconstruction";
import { toNumber } from "@/lib/utils/format";

const STUDIO = "/api/mls/studio";

export interface Page<T> {
  count: number;
  next: boolean;
  items: T[];
}

interface RawPage<T> {
  count?: number;
  next?: string | null;
  results?: T[];
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const orNull = (value: unknown): string | null => text(value).trim() || null;

/* -------------------------------------------------------------------------- */
/* Pre-con projects                                                            */
/* -------------------------------------------------------------------------- */

/** Content statuses the editor offers. "publish" is the only public one. */
export const PRECON_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "publish", label: "Published" },
  { value: "private", label: "Private" },
  { value: "archived", label: "Archived" },
] as const;
export type PreconStatus = (typeof PRECON_STATUSES)[number]["value"];

export const SALES_STAGES: Array<{ value: PreconSalesStage; label: string }> = [
  { value: "coming_soon", label: "Coming Soon" },
  { value: "vip_release", label: "VIP Release" },
  { value: "now_selling", label: "Now Selling" },
  { value: "sold_out", label: "Sold Out" },
];

/**
 * Meta keys the form edits as named fields. Keys are the ones the public page
 * already reads (see `lib/precon/parse.ts`); every other key is shown in the
 * editor's "Other details" list so imported data is never dropped.
 */
export const PRECON_META_FIELDS = [
  { key: "price_display", label: "Price shown to visitors", hint: "e.g. From $699,900" },
  { key: "occupancy_year", label: "Occupancy year", hint: "e.g. 2028" },
  { key: "property_types", label: "Home types", hint: "Comma-separated, e.g. Townhomes, Detached" },
  { key: "deposit_structure", label: "Deposit structure", hint: "Steps separated with ; e.g. $10K on signing;$10K in 30 days", multiline: true },
  { key: "incentives", label: "Incentives", hint: "Separated with | e.g. $10,000 décor credit|Free assignment", multiline: true },
  { key: "amenities", label: "Amenities", hint: "Separated with | e.g. Parks nearby|Minutes to GO", multiline: true },
  { key: "seo_title", label: "SEO title", hint: "Browser tab and search result title" },
] as const;

/** Gated documents: released only to signed-in, phone-verified visitors. */
export const PRECON_DOCUMENT_FIELDS = [
  { key: "floor_plan_url", label: "Floor plans" },
  { key: "price_list_url", label: "Price list" },
  { key: "brochure_url", label: "Brochure" },
] as const;

/** Every meta key the editor shows as a named field (location sits in its own panel). */
export const PRECON_NAMED_META_KEYS: readonly string[] = [
  ...PRECON_META_FIELDS.map((f) => f.key),
  ...PRECON_DOCUMENT_FIELDS.map((f) => f.key),
  "location_display",
];

const NAMED_META_KEYS = new Set<string>(PRECON_NAMED_META_KEYS);

export function isNamedMetaKey(key: string): boolean {
  return NAMED_META_KEYS.has(key);
}

export interface StudioPreconSummary {
  id: number;
  title: string;
  slug: string;
  status: string;
  publishedAt: string | null;
  address: string | null;
  price: number | null;
  developer: string | null;
  salesStage: PreconSalesStage | null;
  isFeatured: boolean;
  featuredOrder: number | null;
  image: string | null;
  assignmentCount: number;
}

export interface StudioPreconAttachment {
  url: string;
  title: string;
  mimeType: string;
}

export interface StudioPrecon extends StudioPreconSummary {
  wpId: number | null;
  body: string;
  excerpt: string;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  area: number | null;
  lotSize: number | null;
  latitude: number | null;
  longitude: number | null;
  attachments: StudioPreconAttachment[];
  meta: Record<string, string>;
}

interface RawStudioPrecon {
  id: number;
  wp_id?: number | null;
  title?: string | null;
  slug?: string | null;
  status?: string | null;
  published_at?: string | null;
  address?: string | null;
  price?: string | number | null;
  developer_name?: string | null;
  sales_stage?: string | null;
  is_featured?: boolean;
  featured_order?: number | null;
  featured_image_url?: string | null;
  assignment_count?: number;
  body?: string | null;
  excerpt?: string | null;
  bedrooms?: number | null;
  bathrooms?: string | number | null;
  garages?: number | null;
  area?: string | number | null;
  lot_size?: string | number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  attachments?: Array<{ url?: string; title?: string; mime_type?: string }>;
  meta?: Record<string, unknown>;
}

const STAGES = new Set<string>(SALES_STAGES.map((s) => s.value));

export function mapStudioPreconSummary(raw: RawStudioPrecon): StudioPreconSummary {
  return {
    id: raw.id,
    title: raw.title?.trim() || `Project #${raw.id}`,
    slug: text(raw.slug),
    status: text(raw.status) || "draft",
    publishedAt: raw.published_at ?? null,
    address: orNull(raw.address),
    price: toNumber(raw.price),
    developer: orNull(raw.developer_name),
    salesStage: raw.sales_stage && STAGES.has(raw.sales_stage) ? (raw.sales_stage as PreconSalesStage) : null,
    isFeatured: Boolean(raw.is_featured),
    featuredOrder: raw.featured_order ?? null,
    image: orNull(raw.featured_image_url),
    assignmentCount: raw.assignment_count ?? 0,
  };
}

export function mapStudioPrecon(raw: RawStudioPrecon): StudioPrecon {
  const meta: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw.meta ?? {})) {
    if (value !== null && value !== undefined) meta[key] = String(value);
  }
  return {
    ...mapStudioPreconSummary(raw),
    wpId: raw.wp_id ?? null,
    body: text(raw.body),
    excerpt: text(raw.excerpt),
    bedrooms: raw.bedrooms ?? null,
    bathrooms: toNumber(raw.bathrooms),
    garages: raw.garages ?? null,
    area: toNumber(raw.area),
    lotSize: toNumber(raw.lot_size),
    latitude: toNumber(raw.latitude),
    longitude: toNumber(raw.longitude),
    attachments: (raw.attachments ?? [])
      .filter((a) => typeof a.url === "string" && a.url)
      .map((a) => ({ url: a.url as string, title: text(a.title), mimeType: text(a.mime_type) })),
    meta,
  };
}

/** Write payload, snake_case for the backend. All optional for PATCH. */
export interface StudioPreconInput {
  title?: string;
  slug?: string;
  status?: PreconStatus;
  body?: string;
  excerpt?: string;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garages?: number | null;
  area?: number | null;
  lot_size?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  developer_name?: string;
  sales_stage?: PreconSalesStage | "";
  is_featured?: boolean;
  featured_order?: number | null;
  attachments?: Array<{ url: string; title: string; mime_type: string }>;
  /** "" or null removes a key; keys not sent are kept. */
  meta?: Record<string, string | null>;
}

function mapPage<R, T>(data: RawPage<R>, map: (raw: R) => T): Page<T> {
  return { count: data.count ?? 0, next: Boolean(data.next), items: (data.results ?? []).map(map) };
}

export async function listStudioPrecon(
  token: string,
  params: { q?: string; status?: string; page?: number; pageSize?: number } = {},
  options: RequestOptions = {},
): Promise<Page<StudioPreconSummary>> {
  const data = await apiFetch<RawPage<RawStudioPrecon>>(`${STUDIO}/precon/`, {
    ...options,
    token,
    cache: "no-store",
    params: {
      q: params.q || undefined,
      status: params.status || undefined,
      page: params.page && params.page > 1 ? params.page : undefined,
      page_size: params.pageSize,
    },
  });
  return mapPage(data, mapStudioPreconSummary);
}

export async function getStudioPrecon(token: string, id: number, options: RequestOptions = {}): Promise<StudioPrecon> {
  return mapStudioPrecon(
    await apiFetch<RawStudioPrecon>(`${STUDIO}/precon/${id}/`, { ...options, token, cache: "no-store" }),
  );
}

export async function createStudioPrecon(token: string, input: StudioPreconInput): Promise<StudioPrecon> {
  return mapStudioPrecon(
    await apiFetch<RawStudioPrecon>(`${STUDIO}/precon/`, { method: "POST", token, body: input }),
  );
}

export async function updateStudioPrecon(token: string, id: number, input: StudioPreconInput): Promise<StudioPrecon> {
  return mapStudioPrecon(
    await apiFetch<RawStudioPrecon>(`${STUDIO}/precon/${id}/`, { method: "PATCH", token, body: input }),
  );
}

export async function deleteStudioPrecon(token: string, id: number): Promise<void> {
  await apiFetch<void>(`${STUDIO}/precon/${id}/`, { method: "DELETE", token });
}

export interface UploadedAsset {
  url: string;
  mimeType: string;
  title: string;
}

export async function uploadPreconAsset(token: string, form: FormData): Promise<UploadedAsset> {
  const raw = await apiFetch<{ url: string; mime_type?: string; title?: string }>(`${STUDIO}/precon/assets/`, {
    method: "POST",
    token,
    body: form,
    timeoutMs: 60_000,
  });
  return { url: raw.url, mimeType: text(raw.mime_type), title: text(raw.title) };
}

export interface BulkUploadResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; wpId: string; error: string }>;
}

export async function bulkUploadPrecon(token: string, form: FormData): Promise<BulkUploadResult> {
  const raw = await apiFetch<{
    created?: number;
    updated?: number;
    skipped?: number;
    errors?: Array<{ row: number; wp_id?: string; error: string }>;
  }>("/api/mls/precon-properties/bulk-upload/", { method: "POST", token, body: form, timeoutMs: 120_000 });
  return {
    created: raw.created ?? 0,
    updated: raw.updated ?? 0,
    skipped: raw.skipped ?? 0,
    errors: (raw.errors ?? []).map((e) => ({ row: e.row, wpId: e.wp_id ?? "", error: e.error })),
  };
}

/* -------------------------------------------------------------------------- */
/* Submission review                                                           */
/* -------------------------------------------------------------------------- */

export const REVIEW_QUEUES = [
  { key: "open", label: "To review" },
  { key: "needs_changes", label: "Needs changes" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
] as const;
export type ReviewQueue = (typeof REVIEW_QUEUES)[number]["key"];

export type ReviewDecision = "under_review" | "needs_changes" | "approved" | "rejected";

export const DECISION_LABELS: Record<ReviewDecision, string> = {
  under_review: "Start review",
  needs_changes: "Request changes",
  approved: "Approve and publish",
  rejected: "Reject",
};

/** Decisions that must explain themselves to the submitter (backend enforces). */
export const NOTE_REQUIRED: ReadonlySet<ReviewDecision> = new Set(["needs_changes", "rejected"]);

export interface ReviewSubmissionSummary {
  id: number;
  purpose: string;
  purposeLabel: string;
  status: string;
  statusLabel: string;
  submitterTypeLabel: string;
  title: string;
  address: string;
  city: string;
  askingPrice: number | null;
  assignmentFee: number | null;
  contactName: string;
  contactEmail: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  preconId: number | null;
  preconTitle: string | null;
  coverUrl: string | null;
  photoCount: number;
}

export interface ReviewMedia {
  id: number;
  type: string;
  typeLabel: string;
  url: string;
  name: string;
}

export interface ReviewSubmission extends ReviewSubmissionSummary {
  projectName: string;
  builderName: string;
  addressLine2: string;
  province: string;
  postalCode: string;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  interiorAreaSqft: number | null;
  availableFrom: string | null;
  description: string;
  occupancyDate: string | null;
  originalPurchasePrice: number | null;
  depositPaid: number | null;
  contactPhone: string;
  ownershipConfirmed: boolean;
  publicationConsent: boolean;
  reviewNote: string;
  submittedIp: string | null;
  submittedUserAgent: string;
  submittedByEmail: string | null;
  reviewedByEmail: string | null;
  media: ReviewMedia[];
  allowedDecisions: ReviewDecision[];
}

type RawSubmission = Record<string, unknown> & { id: number };

const DECISIONS = new Set<string>(Object.keys(DECISION_LABELS));

export function mapReviewSummary(raw: RawSubmission): ReviewSubmissionSummary {
  const address = text(raw.address_line_1);
  return {
    id: raw.id,
    purpose: text(raw.purpose),
    purposeLabel: text(raw.purpose_label) || text(raw.purpose),
    status: text(raw.status),
    statusLabel: text(raw.status_label) || text(raw.status),
    submitterTypeLabel: text(raw.submitter_type_label),
    title: text(raw.project_name).trim() || address || `Submission #${raw.id}`,
    address,
    city: text(raw.city),
    askingPrice: toNumber(raw.asking_price as string | number | null),
    assignmentFee: toNumber(raw.assignment_fee as string | number | null),
    contactName: text(raw.contact_name),
    contactEmail: text(raw.contact_email),
    submittedAt: orNull(raw.submitted_at),
    reviewedAt: orNull(raw.reviewed_at),
    preconId: typeof raw.precon_property === "number" ? raw.precon_property : null,
    preconTitle: orNull(raw.precon_title),
    coverUrl: orNull(raw.cover_url),
    photoCount: typeof raw.photo_count === "number" ? raw.photo_count : 0,
  };
}

export function mapReviewSubmission(raw: RawSubmission): ReviewSubmission {
  const media = Array.isArray(raw.media) ? (raw.media as Array<Record<string, unknown>>) : [];
  const allowed = Array.isArray(raw.allowed_decisions) ? (raw.allowed_decisions as unknown[]) : [];
  return {
    ...mapReviewSummary(raw),
    projectName: text(raw.project_name),
    builderName: text(raw.builder_name),
    addressLine2: text(raw.address_line_2),
    province: text(raw.province),
    postalCode: text(raw.postal_code),
    propertyType: text(raw.property_type),
    bedrooms: toNumber(raw.bedrooms as string | number | null),
    bathrooms: toNumber(raw.bathrooms as string | number | null),
    interiorAreaSqft: toNumber(raw.interior_area_sqft as string | number | null),
    availableFrom: orNull(raw.available_from),
    description: text(raw.description),
    occupancyDate: orNull(raw.occupancy_date),
    originalPurchasePrice: toNumber(raw.original_purchase_price as string | number | null),
    depositPaid: toNumber(raw.deposit_paid as string | number | null),
    contactPhone: text(raw.contact_phone),
    ownershipConfirmed: Boolean(raw.ownership_confirmed),
    publicationConsent: Boolean(raw.publication_consent),
    reviewNote: text(raw.review_note),
    submittedIp: orNull(raw.submitted_ip),
    submittedUserAgent: text(raw.submitted_user_agent),
    submittedByEmail: orNull(raw.submitted_by_email),
    reviewedByEmail: orNull(raw.reviewed_by_email),
    media: media
      .filter((m) => typeof m.url === "string" && m.url)
      .map((m) => ({
        id: Number(m.id),
        type: text(m.media_type),
        typeLabel: text(m.media_type_label) || text(m.media_type),
        url: m.url as string,
        name: text(m.name),
      })),
    allowedDecisions: allowed.filter((d): d is ReviewDecision => typeof d === "string" && DECISIONS.has(d)),
  };
}

export type QueueCounts = Record<ReviewQueue, number>;

export async function listReviewQueue(
  token: string,
  params: { queue?: ReviewQueue; purpose?: string; q?: string; page?: number } = {},
  options: RequestOptions = {},
): Promise<Page<ReviewSubmissionSummary> & { counts: QueueCounts }> {
  const data = await apiFetch<RawPage<RawSubmission> & { counts?: Partial<QueueCounts> }>(`${STUDIO}/submissions/`, {
    ...options,
    token,
    cache: "no-store",
    params: {
      queue: params.queue,
      purpose: params.purpose || undefined,
      q: params.q || undefined,
      page: params.page && params.page > 1 ? params.page : undefined,
    },
  });
  const counts = Object.fromEntries(
    REVIEW_QUEUES.map(({ key }) => [key, data.counts?.[key] ?? 0]),
  ) as QueueCounts;
  return { ...mapPage(data, mapReviewSummary), counts };
}

export async function getReviewSubmission(token: string, id: number, options: RequestOptions = {}): Promise<ReviewSubmission> {
  return mapReviewSubmission(
    await apiFetch<RawSubmission>(`${STUDIO}/submissions/${id}/`, { ...options, token, cache: "no-store" }),
  );
}

export interface DecisionInput {
  status: ReviewDecision;
  review_note: string;
  precon_property?: number | null;
  notify?: boolean;
}

export async function decideSubmission(
  token: string,
  id: number,
  input: DecisionInput,
): Promise<ReviewSubmission & { emailed: boolean }> {
  const raw = await apiFetch<RawSubmission & { emailed?: boolean }>(`${STUDIO}/submissions/${id}/decision/`, {
    method: "POST",
    token,
    body: input,
  });
  return { ...mapReviewSubmission(raw), emailed: Boolean(raw.emailed) };
}

export async function linkSubmissionPrecon(token: string, id: number, preconId: number | null): Promise<ReviewSubmission> {
  return mapReviewSubmission(
    await apiFetch<RawSubmission>(`${STUDIO}/submissions/${id}/precon/`, {
      method: "PATCH",
      token,
      body: { precon_property: preconId },
    }),
  );
}

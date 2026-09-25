/**
 * Owner / agent / builder listing submissions (mls-v2 `ListingSubmission`).
 *
 * These are private intake records, not MLS® listings: a submission is a draft
 * until the owner submits it, then staff review it in the Django admin. The
 * shapes below mirror the serializer field-for-field (snake_case) on purpose —
 * the wizard PATCHes the same keys back, so a camelCase mapping layer would
 * only add a second place for the two to drift.
 *
 * Server-side helpers take an explicit access token; the browser reaches them
 * through the /api/listing-submissions/* route handlers.
 */

import { apiFetch, ApiError } from "@/lib/api/client";

const BASE = "/api/mls/listing-submissions";

export type SubmissionPurpose = "sale" | "rent" | "assignment";
export type SubmitterType = "owner" | "agent" | "builder";
export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_changes"
  | "approved"
  | "rejected"
  | "withdrawn";
export type SubmissionMediaType = "photo" | "floor_plan" | "supporting_document";

export interface SubmissionMedia {
  id: number;
  media_type: SubmissionMediaType;
  file_url: string;
  display_order: number;
  uploaded_at: string;
}

/** Editable fields. Decimals arrive from DRF as strings; send strings or numbers. */
export interface ListingSubmissionInput {
  submitter_type: SubmitterType;
  purpose: SubmissionPurpose;
  address_line_1: string;
  address_line_2: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  property_type: string;
  bedrooms: string | null;
  bathrooms: string | null;
  interior_area_sqft: number | null;
  asking_price: string | null;
  available_from: string | null;
  description: string;
  project_name: string;
  builder_name: string;
  precon_property: number | null;
  occupancy_date: string | null;
  original_purchase_price: string | null;
  deposit_paid: string | null;
  assignment_fee: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  ownership_confirmed: boolean;
  publication_consent: boolean;
}

export interface ListingSubmission extends ListingSubmissionInput {
  id: number;
  submitter_type_label: string;
  purpose_label: string;
  status: SubmissionStatus;
  status_label: string;
  review_note: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  media: SubmissionMedia[];
}

/** Statuses in which the backend accepts PATCH and media uploads. */
export const EDITABLE_STATUSES: ReadonlySet<SubmissionStatus> = new Set([
  "draft",
  "needs_changes",
]);

/** Statuses the backend refuses to withdraw from. */
export const FINAL_STATUSES: ReadonlySet<SubmissionStatus> = new Set([
  "rejected",
  "withdrawn",
]);

export function isEditable(status: SubmissionStatus): boolean {
  return EDITABLE_STATUSES.has(status);
}

export function canWithdraw(status: SubmissionStatus): boolean {
  return !FINAL_STATUSES.has(status);
}

/* -------------------------------------------------------------------------- */
/* Server-side calls                                                           */
/* -------------------------------------------------------------------------- */

export function listMySubmissions(token: string) {
  return apiFetch<ListingSubmission[]>(`${BASE}/mine/`, { token });
}

export function getSubmission(token: string, id: number) {
  return apiFetch<ListingSubmission>(`${BASE}/${id}/`, { token });
}

export function createSubmission(token: string, body: Partial<ListingSubmissionInput>) {
  return apiFetch<ListingSubmission>(`${BASE}/`, { method: "POST", token, body });
}

export function updateSubmission(
  token: string,
  id: number,
  body: Partial<ListingSubmissionInput>,
) {
  return apiFetch<ListingSubmission>(`${BASE}/${id}/`, { method: "PATCH", token, body });
}

/**
 * Multipart upload. `apiFetch` passes FormData untouched so fetch writes its
 * own boundary header. Uploads get a longer timeout than the 15s default — a
 * slow uplink on a 4 MB photo can legitimately take that long.
 */
export function uploadSubmissionMedia(token: string, id: number, form: FormData) {
  return apiFetch<SubmissionMedia>(`${BASE}/${id}/media/`, {
    method: "POST",
    token,
    body: form,
    timeoutMs: 60_000,
  });
}

/** `headers`: the visitor's forwarded IP/user agent, recorded with the submission. */
export function submitSubmission(token: string, id: number, headers?: Record<string, string>) {
  return apiFetch<ListingSubmission>(`${BASE}/${id}/submit/`, { method: "POST", token, headers });
}

export function withdrawSubmission(token: string, id: number) {
  return apiFetch<ListingSubmission>(`${BASE}/${id}/withdraw/`, { method: "POST", token });
}

/* -------------------------------------------------------------------------- */
/* Error shaping                                                               */
/* -------------------------------------------------------------------------- */

/** What the route handlers return on failure, and what the wizard reads. */
export interface SubmissionErrorBody {
  error: string;
  fieldErrors: Record<string, string>;
}

const NON_FIELD_KEYS = new Set(["detail", "non_field_errors", "error", "message"]);

/**
 * DRF field errors arrive as `{field: ["msg", …]}` (or a bare string). Keep the
 * first message per field so each input shows one line; anything that isn't a
 * short plain string is dropped rather than rendered.
 */
export function toFieldErrors(payload: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return out;
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (NON_FIELD_KEYS.has(key)) continue;
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === "string" && first.trim() && first.length <= 200 && !first.includes("<")) {
      out[key] = first.trim();
    }
  }
  return out;
}

/** Normalises any thrown error into `{error, fieldErrors}` plus a status. */
export function toSubmissionError(
  error: unknown,
  fallback: string,
): { body: SubmissionErrorBody; status: number } {
  if (error instanceof ApiError) {
    const fieldErrors = error.status === 400 ? toFieldErrors(error.payload) : {};
    const hasFields = Object.keys(fieldErrors).length > 0;
    return {
      body: {
        // A list of field problems reads better as one summary line; the
        // specific messages land next to their inputs.
        error: hasFields ? "Please fix the highlighted fields." : error.message,
        fieldErrors,
      },
      status: error.status || 500,
    };
  }
  return { body: { error: fallback, fieldErrors: {} }, status: 500 };
}

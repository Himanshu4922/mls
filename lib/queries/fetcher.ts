/**
 * The one browser-side JSON fetcher behind every queryFn and mutationFn.
 *
 * It replaces the per-file copies of `if (!res.ok) … res.json()` and message
 * extraction. Route handlers under app/api reply with `{error, fieldErrors?}`
 * on failure; that becomes an `HttpError` a form can spread onto its fields
 * and the QueryClient's retry predicate can read the status from.
 */

export class HttpError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;
  readonly payload: unknown;

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string> = {},
    payload?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.payload = payload;
  }

  get isAuth() {
    return this.status === 401;
  }
}

/** Status 0 = the request never got a response (offline, DNS, aborted). */
export const NETWORK_ERROR_STATUS = 0;

function defaultMessage(status: number): string {
  if (status === 401) return "Your session expired. Sign in again.";
  if (status === 403) return "You don't have access to that.";
  if (status === 404) return "We couldn't find that.";
  if (status === 413) return "That file is too large to upload.";
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  return "Something went wrong. Please try again.";
}

export function httpErrorFrom(status: number, body: unknown, fallback?: string): HttpError {
  const record = (body && typeof body === "object" ? body : {}) as {
    error?: unknown;
    detail?: unknown;
    fieldErrors?: unknown;
  };
  const message =
    (typeof record.error === "string" && record.error) ||
    (typeof record.detail === "string" && record.detail) ||
    // A 401's generic text beats a caller fallback like "Could not save":
    // it tells the user what to do.
    (status === 401 ? defaultMessage(status) : fallback) ||
    defaultMessage(status);
  const fieldErrors =
    record.fieldErrors && typeof record.fieldErrors === "object"
      ? (record.fieldErrors as Record<string, string>)
      : {};
  return new HttpError(message, status, fieldErrors, body);
}

export interface FetchJsonOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON-encoded when set, except FormData, which is sent as multipart. */
  body?: unknown;
  signal?: AbortSignal;
  /** Message used when the server gives none. */
  fallback?: string;
  cache?: RequestCache;
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { method = "GET", body, signal, fallback, cache } = options;
  // FormData (uploads) goes as-is so fetch sets its own multipart boundary.
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      signal,
      cache,
      headers: body !== undefined && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    // Let TanStack see a real abort so it doesn't treat cancellation as failure.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new HttpError(
      "Can't reach the server. Check your connection and try again.",
      NETWORK_ERROR_STATUS,
    );
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw httpErrorFrom(res.status, data, fallback);
  return data as T;
}

/**
 * Retry network failures and 5xx once; never retry a 4xx — the answer won't
 * change, and retrying a 401 only delays the sign-in prompt.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (error instanceof HttpError) {
    return error.status === NETWORK_ERROR_STATUS || error.status >= 500;
  }
  // Unknown errors (e.g. a queryFn bug) aren't worth a retry either.
  return false;
}

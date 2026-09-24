import type {
  ListingSubmission,
  ListingSubmissionInput,
  SubmissionMedia,
  SubmissionMediaType,
} from "@/lib/api/listingSubmissions";
import { HttpError, httpErrorFrom, fetchJson } from "@/lib/queries/fetcher";

/**
 * Browser-side calls to /api/listing-submissions/*. The route handlers attach
 * the session token and reshape DRF errors to `{error, fieldErrors}`;
 * `fetchJson` turns that into an HttpError the wizard can spread onto its
 * inputs.
 */

const BASE = "/api/listing-submissions";

/**
 * Kept as an alias so the wizard's `instanceof SubmissionRequestError` checks
 * keep working; it is the shared HttpError (status + fieldErrors).
 */
export { HttpError as SubmissionRequestError };

function request<T>(
  path: string,
  init?: { method?: "GET" | "POST" | "PATCH"; body?: unknown },
): Promise<T> {
  return fetchJson<T>(`${BASE}${path}`, { method: init?.method, body: init?.body });
}

export const submissionsApi = {
  mine: () => request<ListingSubmission[]>(""),
  get: (id: number) => request<ListingSubmission>(`/${id}`),
  create: (body: Partial<ListingSubmissionInput>) =>
    request<ListingSubmission>("", { method: "POST", body }),
  update: (id: number, body: Partial<ListingSubmissionInput>) =>
    request<ListingSubmission>(`/${id}`, { method: "PATCH", body }),
  submit: (id: number) => request<ListingSubmission>(`/${id}/submit`, { method: "POST" }),
  withdraw: (id: number) => request<ListingSubmission>(`/${id}/withdraw`, { method: "POST" }),
};

/**
 * Uploads one file with progress. XHR rather than fetch because fetch still has
 * no upload-progress event in browsers.
 */
export function uploadMedia(
  id: number,
  file: File,
  mediaType: SubmissionMediaType,
  displayOrder: number,
  onProgress: (percent: number) => void,
): Promise<SubmissionMedia> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("media_type", mediaType);
    form.append("display_order", String(displayOrder));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/${id}/media`);
    xhr.responseType = "text";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () =>
      reject(new HttpError("Upload failed. Check your connection and try again.", 0));
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // A platform-level 413 comes back as HTML/plain text.
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as SubmissionMedia);
      else reject(httpErrorFrom(xhr.status, body));
    };
    xhr.send(form);
  });
}

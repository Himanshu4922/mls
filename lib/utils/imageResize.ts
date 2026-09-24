/**
 * Client-side upload preparation for listing-submission media.
 *
 * Why this exists: both this app and the mls-v2 backend run on Vercel, whose
 * functions reject request bodies over ~4.5 MB before our code sees them. The
 * backend accepts 15 MB files, but a phone photo that size would die at the
 * platform edge with an opaque 413. So images are downscaled in the browser
 * (longest edge ≤ 2560 px, re-encoded as JPEG / WebP) until they fit under
 * UPLOAD_TARGET_BYTES, and PDFs — which can't be shrunk here — are refused
 * above PDF_MAX_BYTES with a message that says why.
 *
 * Lifting the cap properly means direct-to-storage uploads (e.g. signed
 * Cloudinary uploads) so the file never transits a function.
 *
 * The planning functions are pure (tested); `prepareUpload` needs a DOM.
 */

/** Hard cap on what the browser will send through the proxy. */
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
/** Target size for re-encoded images, leaving headroom for multipart overhead. */
export const UPLOAD_TARGET_BYTES = 3.5 * 1024 * 1024;
/** PDFs are sent as-is, so they must already fit. */
export const PDF_MAX_BYTES = 4 * 1024 * 1024;
/** Longest edge after downscaling — sharper than any listing gallery renders. */
export const MAX_EDGE_PX = 2560;
/** Raw picker limit, matching the backend's own 15 MB validation. */
export const RAW_MAX_BYTES = 15 * 1024 * 1024;

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** Scales (width, height) so the longest edge is at most `maxEdge`. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge = MAX_EDGE_PX,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest <= 0) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Decides whether an image needs re-encoding: only when it is too heavy or too
 * large in pixels. Small, already-reasonable files go up untouched so their
 * quality and metadata-free bytes are preserved.
 */
export function needsResize(
  bytes: number,
  width: number,
  height: number,
  targetBytes = UPLOAD_TARGET_BYTES,
): boolean {
  return bytes > targetBytes || Math.max(width, height) > MAX_EDGE_PX;
}

/** PNGs (screenshots, floor plans) stay lossless-ish via WebP; photos go JPEG. */
export function outputType(inputType: string): "image/jpeg" | "image/webp" {
  return inputType === "image/png" || inputType === "image/webp" ? "image/webp" : "image/jpeg";
}

/** Rejection reason for a file that can't be sent, or null when it can. */
export function uploadBlocker(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Upload a JPEG, PNG, WebP or PDF file.";
  if (file.type === "application/pdf" && file.size > PDF_MAX_BYTES) {
    return "PDFs must be 4 MB or smaller — our upload service can't accept larger files yet. Try compressing or splitting it.";
  }
  return null;
}

/** "photo.png" + "image/jpeg" → "photo.jpg" */
export function renameFor(name: string, type: string): string {
  const ext = type === "image/webp" ? "webp" : "jpg";
  const base = name.replace(/\.[^.]+$/, "") || "photo";
  return `${base}.${ext}`;
}

/* -------------------------------------------------------------------------- */
/* Browser-only                                                                */
/* -------------------------------------------------------------------------- */

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Returns a file that fits the upload cap, or throws with a user-facing reason.
 * Quality steps down until the target is met; the edge shrinks as a last resort
 * for pathological images (huge panoramas) that stay heavy at low quality.
 */
export async function prepareUpload(file: File): Promise<File> {
  const blocker = uploadBlocker(file);
  if (blocker) throw new Error(blocker);
  if (file.type === "application/pdf") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("That image couldn't be read. Try a different file.");

  try {
    if (!needsResize(file.size, bitmap.width, bitmap.height)) return file;

    const type = outputType(file.type);
    let edge = MAX_EDGE_PX;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, edge);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) break;
      if (type === "image/jpeg") {
        // JPEG has no alpha; paint white so transparent PNG areas aren't black.
        context.fillStyle = "#fff";
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of [0.86, 0.76, 0.66]) {
        const blob = await canvasToBlob(canvas, type, quality);
        if (blob && blob.size <= UPLOAD_TARGET_BYTES) {
          return new File([blob], renameFor(file.name, type), { type });
        }
      }
      edge = Math.round(edge * 0.75);
    }
  } finally {
    bitmap.close();
  }
  throw new Error("That image is too large to upload. Try a smaller photo.");
}

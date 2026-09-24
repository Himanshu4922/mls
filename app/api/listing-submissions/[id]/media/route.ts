import { NextResponse } from "next/server";
import { uploadSubmissionMedia } from "@/lib/api/listingSubmissions";
import { ACCEPTED_TYPES, UPLOAD_MAX_BYTES } from "@/lib/utils/imageResize";
import { invalidId, parseId, submissionError, tokenOr401 } from "../../_shared";

const MEDIA_TYPES = new Set(["photo", "floor_plan", "supporting_document"]);

/**
 * POST /api/listing-submissions/<id>/media — one file per request.
 *
 * Re-sends the multipart body to the backend with the user's token; fetch sets
 * the boundary header itself, so Content-Type is never set by hand. The size
 * check mirrors the client-side cap in lib/utils/imageResize.ts: on Vercel a
 * larger body would be rejected by the platform anyway (~4.5 MB), this just
 * fails with a readable message when running somewhere more permissive.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await tokenOr401();
  if (token instanceof NextResponse) return token;
  const id = parseId((await params).id);
  if (!id) return invalidId();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload.", fieldErrors: {} }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was selected.", fieldErrors: {} }, { status: 400 });
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Upload a JPEG, PNG, WebP or PDF file.", fieldErrors: {} },
      { status: 400 },
    );
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    return NextResponse.json(
      { error: "Files must be 4 MB or smaller.", fieldErrors: {} },
      { status: 413 },
    );
  }

  const mediaType = String(form.get("media_type") ?? "photo");
  const order = Number.parseInt(String(form.get("display_order") ?? "0"), 10);

  const forwarded = new FormData();
  forwarded.append("file", file, file.name);
  forwarded.append("media_type", MEDIA_TYPES.has(mediaType) ? mediaType : "photo");
  forwarded.append("display_order", String(Number.isFinite(order) && order >= 0 ? order : 0));

  try {
    return NextResponse.json(await uploadSubmissionMedia(token, id, forwarded), { status: 201 });
  } catch (error) {
    return submissionError(error, "Could not upload that file.");
  }
}

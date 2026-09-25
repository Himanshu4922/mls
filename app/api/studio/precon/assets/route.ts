import { NextResponse } from "next/server";
import { errorResponse, guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { uploadPreconAsset } from "@/lib/api/studioAdmin";

/** Mirrors the backend default (PRECON_ASSET_MAX_UPLOAD_MB) for a fast failure. */
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/;

/** POST /api/studio/precon/assets — a project photo or PDF, stored in Cloudinary. */
export async function POST(request: Request) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was selected." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Files must be 25 MB or smaller." }, { status: 400 });
  }
  if (file.type && !ALLOWED.test(file.type)) {
    return NextResponse.json({ error: "Upload a JPEG, PNG, WebP, GIF or PDF file." }, { status: 400 });
  }

  const forwarded = new FormData();
  forwarded.append("file", file, file.name);
  try {
    return NextResponse.json({ asset: await uploadPreconAsset(session.token, forwarded) }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Could not upload that file.");
  }
}

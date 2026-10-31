import { NextResponse } from "next/server";
import { errorResponse, guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { uploadListingMedia } from "@/lib/api/estateListings";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = /^image\/(jpeg|png|webp|gif)$/;

/** POST /api/studio/listings/media — upload a listing photo to Cloudinary. */
export async function POST(request: Request) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const file = form.get("file") ?? form.get("images");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was selected." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photos must be 15 MB or smaller." }, { status: 400 });
  }
  if (file.type && !ALLOWED.test(file.type)) {
    return NextResponse.json({ error: "Upload a JPEG, PNG, WebP, or GIF file." }, { status: 400 });
  }

  const forwarded = new FormData();
  forwarded.append("images", file, file.name);
  try {
    const asset = await uploadListingMedia(session.token, forwarded);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Could not upload that photo.");
  }
}

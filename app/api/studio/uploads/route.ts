import { NextResponse } from "next/server";
import { errorResponse, guard, isGuardFailure } from "@/app/api/studio/_guard";
import { apiFetch } from "@/lib/api/client";

/** Mirrors the backend's cap so an oversized file fails fast, before upload. */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * POST /api/studio/uploads — an image for the editor body.
 *
 * Forwards the multipart body straight through; `apiFetch` passes FormData
 * untouched and lets fetch set its own boundary header. The backend re-encodes
 * the image, so validation here is only for a fast, friendly failure.
 */
export async function POST(request: Request) {
  const session = await guard();
  if (isGuardFailure(session)) return session;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image was selected." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Images must be 5 MB or smaller." },
      { status: 400 },
    );
  }

  const forwarded = new FormData();
  forwarded.append("file", file, file.name);

  try {
    const result = await apiFetch<{ url: string; width: number; height: number }>(
      "/api/vlog/uploads/",
      { method: "POST", token: session.token, body: forwarded },
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Could not upload that image.");
  }
}

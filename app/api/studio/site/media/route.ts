import { NextResponse } from "next/server";
import { guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { uploadSiteImage } from "@/lib/api/siteAdmin";
import { siteError } from "@/app/api/studio/site/_shared";

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
  const role = form.get("role") === "hero" ? "hero" : "section";
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  try {
    return NextResponse.json(await uploadSiteImage(session.token, file, role), { status: 201 });
  } catch (error) {
    return siteError(error, "Could not upload that image.");
  }
}

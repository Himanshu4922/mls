import { NextResponse } from "next/server";
import { errorResponse, guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { revalidatePreconPages } from "@/app/api/studio/precon/_revalidate";
import { bulkUploadPrecon } from "@/lib/api/studioAdmin";

const MAX_BYTES = 10 * 1024 * 1024;

/** POST /api/studio/precon/bulk — CSV/Excel upsert keyed by wp_id. */
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
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
    return NextResponse.json({ error: "Upload a .csv, .xlsx or .xls file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Files must be 10 MB or smaller." }, { status: 400 });
  }

  const forwarded = new FormData();
  forwarded.append("file", file, file.name);
  try {
    const result = await bulkUploadPrecon(session.token, forwarded);
    if (result.created || result.updated) revalidatePreconPages();
    return NextResponse.json({ result });
  } catch (error) {
    return errorResponse(error, "Could not import that file.");
  }
}

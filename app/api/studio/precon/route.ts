import { NextResponse } from "next/server";
import { errorResponse, guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { revalidatePreconPages } from "@/app/api/studio/precon/_revalidate";
import { createStudioPrecon, listStudioPrecon, type StudioPreconInput } from "@/lib/api/studioAdmin";

/** GET /api/studio/precon?q= — project search, used by the assignment linker. */
export async function GET(request: Request) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;

  const url = new URL(request.url);
  try {
    const page = await listStudioPrecon(session.token, {
      q: url.searchParams.get("q")?.slice(0, 120) ?? "",
      pageSize: 10,
    });
    return NextResponse.json({ items: page.items });
  } catch (error) {
    return errorResponse(error, "Could not search projects.");
  }
}

/** POST /api/studio/precon — create a project (draft unless told otherwise). */
export async function POST(request: Request) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;

  let body: StudioPreconInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const project = await createStudioPrecon(session.token, { status: "draft", ...body });
    revalidatePreconPages();
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Could not create the project.");
  }
}

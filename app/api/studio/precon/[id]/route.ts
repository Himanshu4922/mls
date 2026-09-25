import { NextResponse } from "next/server";
import { errorResponse, guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { revalidatePreconPages } from "@/app/api/studio/precon/_revalidate";
import { deleteStudioPrecon, updateStudioPrecon, type StudioPreconInput } from "@/lib/api/studioAdmin";

type Params = { params: Promise<{ id: string }> };

async function projectId(params: Params["params"]): Promise<number | null> {
  const id = Number.parseInt((await params).id, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** PATCH /api/studio/precon/<id> — partial update, including publish. */
export async function PATCH(request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const id = await projectId(params);
  if (!id) return NextResponse.json({ error: "Invalid project." }, { status: 400 });

  let body: StudioPreconInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const project = await updateStudioPrecon(session.token, id, body);
    revalidatePreconPages();
    return NextResponse.json({ project });
  } catch (error) {
    return errorResponse(error, "Could not save the project.");
  }
}

/** DELETE /api/studio/precon/<id> — refused (409) when buyers have requested documents. */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const id = await projectId(params);
  if (!id) return NextResponse.json({ error: "Invalid project." }, { status: 400 });

  try {
    await deleteStudioPrecon(session.token, id);
    revalidatePreconPages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Could not delete the project.");
  }
}

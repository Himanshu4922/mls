import { NextResponse } from "next/server";
import { guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { revalidateSite, siteError } from "@/app/api/studio/site/_shared";
import { apiFetch } from "@/lib/api/client";

const RESOURCES = new Set(["incentives", "partners", "community-images", "news"]);

type Params = { params: Promise<{ resource: string; id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const { resource, id } = await params;
  if (!RESOURCES.has(resource)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const updated = await apiFetch(`/api/home/studio/${resource}/${encodeURIComponent(id)}/`, {
      token: session.token,
      method: "PATCH",
      body,
    });
    revalidateSite();
    return NextResponse.json(updated);
  } catch (error) {
    return siteError(error, "Could not save that.");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const { resource, id } = await params;
  if (!RESOURCES.has(resource)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    await apiFetch(`/api/home/studio/${resource}/${encodeURIComponent(id)}/`, {
      token: session.token,
      method: "DELETE",
    });
    revalidateSite();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return siteError(error, "Could not delete that.");
  }
}

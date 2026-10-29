import { NextResponse } from "next/server";
import { guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { revalidateSite, siteError } from "@/app/api/studio/site/_shared";
import { apiFetch } from "@/lib/api/client";

const RESOURCES = new Set(["incentives", "partners", "community-images", "news"]);

type Params = { params: Promise<{ resource: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const { resource } = await params;
  if (!RESOURCES.has(resource)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    return NextResponse.json(await apiFetch(`/api/home/studio/${resource}/`, { token: session.token }));
  } catch (error) {
    return siteError(error, "Could not load this list.");
  }
}

export async function POST(request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const { resource } = await params;
  if (!RESOURCES.has(resource)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const created = await apiFetch(`/api/home/studio/${resource}/`, { token: session.token, method: "POST", body });
    revalidateSite();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return siteError(error, "Could not create that.");
  }
}

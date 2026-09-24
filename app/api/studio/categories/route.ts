import { NextResponse } from "next/server";
import { errorResponse, guard, isGuardFailure } from "@/app/api/studio/_guard";
import { getBlogCategories } from "@/lib/api/blog";
import { createCategory } from "@/lib/api/studio";

/** GET /api/studio/categories — the list, for the editor's category picker. */
export async function GET() {
  const session = await guard();
  if (isGuardFailure(session)) return session;

  // Categories are public to read, so the unauthenticated reader is reused.
  return NextResponse.json({ categories: await getBlogCategories({ cache: "no-store" }) });
}

/** POST /api/studio/categories — create one inline from the editor. */
export async function POST(request: Request) {
  const session = await guard();
  if (isGuardFailure(session)) return session;

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "A category name is required." }, { status: 400 });
  }

  try {
    return NextResponse.json(
      { category: await createCategory(session.token, name) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, "Could not create that category.");
  }
}

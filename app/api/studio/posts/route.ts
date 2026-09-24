import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { errorResponse, guard, isGuardFailure } from "@/app/api/studio/_guard";
import { createStudioPost, listStudioPosts, type StudioPostInput } from "@/lib/api/studio";

/** GET /api/studio/posts — every post, drafts included. */
export async function GET() {
  const session = await guard();
  if (isGuardFailure(session)) return session;

  try {
    return NextResponse.json({ posts: await listStudioPosts(session.token) });
  } catch (error) {
    return errorResponse(error, "Could not load posts.");
  }
}

/** POST /api/studio/posts — create a post (draft unless told otherwise). */
export async function POST(request: Request) {
  const session = await guard();
  if (isGuardFailure(session)) return session;

  let body: StudioPostInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const post = await createStudioPost(session.token, {
      // A new post is a draft unless the author explicitly published it, so a
      // half-written piece can never reach the public site by accident.
      status: "draft",
      ...body,
    });
    // Cheap insurance: a post created as published must show up at once.
    revalidatePath("/blog");
    revalidatePath("/");
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Could not create the post.");
  }
}

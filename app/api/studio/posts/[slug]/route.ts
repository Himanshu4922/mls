import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { errorResponse, guard, isGuardFailure } from "@/app/api/studio/_guard";
import {
  deleteStudioPost,
  getStudioPost,
  updateStudioPost,
  type StudioPostInput,
} from "@/lib/api/studio";

type Params = { params: Promise<{ slug: string }> };

/**
 * Drop the cached public pages for a post.
 *
 * `/blog` and `/blog/[slug]` are ISR'd with `revalidate = 1800`. Without this,
 * unpublishing a post leaves it readable to the public for up to 30 minutes —
 * verified, not theoretical — and a publish wouldn't appear for just as long.
 * Both are surprising in a tool whose whole job is controlling what is live.
 *
 * Also revalidates the home page, which carries the "Insights" rail.
 */
function revalidatePublicPages(slug: string) {
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/blog");
  revalidatePath("/");
}

/** GET /api/studio/posts/<slug> — one post, draft or published. */
export async function GET(_request: Request, { params }: Params) {
  const session = await guard();
  if (isGuardFailure(session)) return session;

  const { slug } = await params;
  try {
    return NextResponse.json({ post: await getStudioPost(session.token, slug) });
  } catch (error) {
    return errorResponse(error, "Could not load that post.");
  }
}

/** PATCH /api/studio/posts/<slug> — partial update, including publish. */
export async function PATCH(request: Request, { params }: Params) {
  const session = await guard();
  if (isGuardFailure(session)) return session;

  const { slug } = await params;

  let body: StudioPostInput & { expected_updated_at?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { expected_updated_at: expected, ...input } = body;

  try {
    // Concurrency guard: if the post changed since the editor loaded it, stop
    // rather than silently overwriting a colleague's edit. Cheap read-then-write
    // is fine here — the team is small and posts are edited one at a time.
    if (expected) {
      const current = await getStudioPost(session.token, slug);
      if (current.updatedAt && current.updatedAt !== expected) {
        return NextResponse.json(
          {
            error:
              "Someone else saved changes to this post while you were editing. " +
              "Reload to see their version — your text is still here until you do.",
            conflict: true,
          },
          { status: 409 },
        );
      }
    }

    const post = await updateStudioPost(session.token, slug, input);
    revalidatePublicPages(slug);
    // A changed slug leaves the OLD url cached too.
    if (post.slug !== slug) revalidatePublicPages(post.slug);
    return NextResponse.json({ post });
  } catch (error) {
    return errorResponse(error, "Could not save the post.");
  }
}

/** DELETE /api/studio/posts/<slug> */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await guard();
  if (isGuardFailure(session)) return session;

  const { slug } = await params;
  try {
    await deleteStudioPost(session.token, slug);
    revalidatePublicPages(slug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Could not delete the post.");
  }
}

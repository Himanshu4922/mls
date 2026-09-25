"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { SearchInput } from "@/components/ui/Field";
import type { StudioPost } from "@/lib/api/studio";
import { useDeletePost } from "@/lib/queries/studio";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

type StatusFilter = "all" | "published" | "draft" | "scheduled";

/** A published post dated in the future is scheduled, not yet live. */
function isScheduled(post: StudioPost): boolean {
  if (post.status !== "published" || !post.publishDate) return false;
  const at = Date.parse(post.publishDate);
  return Number.isFinite(at) && at > Date.now();
}

export function PostListTable({ posts }: { posts: StudioPost[] }) {
  // Refreshes the server-rendered list on success.
  const deletePost = useDeletePost();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<StudioPost | null>(null);
  const busy = deletePost.isPending;
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: posts.length,
      published: posts.filter((p) => p.status === "published" && !isScheduled(p)).length,
      draft: posts.filter((p) => p.status === "draft").length,
      scheduled: posts.filter(isScheduled).length,
    }),
    [posts],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (filter === "published" && (post.status !== "published" || isScheduled(post))) return false;
      if (filter === "draft" && post.status !== "draft") return false;
      if (filter === "scheduled" && !isScheduled(post)) return false;
      if (term && !post.title.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [posts, filter, search]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setError(null);
    try {
      await deletePost.mutateAsync(pendingDelete.slug);
      setPendingDelete(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the post.");
    }
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-surface border border-line bg-surface p-10 text-center">
        <h2 className="text-h3 text-ink">No posts yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-small text-ink-muted">
          Write your first article. It starts as a draft, so nothing goes live
          until you publish it.
        </p>
        <Link
          href="/studio/new"
          className="mt-5 inline-block rounded-control bg-navy px-4 py-2 text-small font-medium text-white"
        >
          New post
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "published", "scheduled", "draft"] as StatusFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={cn(
                "rounded-full border px-3 py-1.5 text-caption font-medium capitalize transition-colors",
                filter === value
                  ? "border-navy bg-navy text-white"
                  : "border-line bg-surface text-ink-muted hover:border-navy hover:text-ink",
              )}
            >
              {value} ({counts[value]})
            </button>
          ))}
        </div>

        <SearchInput
          label="Search posts by title"
          value={search}
          onValueChange={setSearch}
          placeholder="Search titles…"
          className="ml-auto flex-1 sm:max-w-xs"
        />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-surface border border-line bg-surface p-8 text-center text-small text-ink-muted">
          No posts match that filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-surface border border-line bg-surface">
          <table className="w-full min-w-[46rem] border-collapse text-small">
            <thead>
              <tr className="border-b border-line text-left text-caption text-ink-muted">
                <th scope="col" className="px-4 py-3 font-medium">Title</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Category</th>
                <th scope="col" className="px-4 py-3 font-medium">Updated</th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((post) => (
                <tr key={post.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/studio/${encodeURIComponent(post.slug)}`}
                      className="font-medium text-ink hover:text-navy"
                    >
                      {post.title || "(untitled)"}
                    </Link>
                    <p className="mt-0.5 text-caption text-ink-subtle">/{post.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill post={post} />
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{post.categoryName ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {post.updatedAt ? formatDate(post.updatedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-caption">
                      <Link
                        href={`/studio/${encodeURIComponent(post.slug)}/preview`}
                        className="text-ink-muted hover:text-navy"
                      >
                        Preview
                      </Link>
                      {post.status === "published" && !isScheduled(post) && (
                        <Link
                          href={`/blog/${encodeURIComponent(post.slug)}`}
                          className="text-ink-muted hover:text-navy"
                        >
                          View
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingDelete(post)}
                        className="text-negative hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Naming the post in the confirmation — a bare "Are you sure?" is how
          the wrong article gets deleted. */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => {
          setPendingDelete(null);
          setError(null);
        }}
        onConfirm={() => void confirmDelete()}
        title="Delete this post?"
        confirmLabel="Delete post"
        tone="danger"
        busy={busy}
        error={error}
      >
        {pendingDelete && (
          <p>
            <strong className="text-ink">{pendingDelete.title || "(untitled)"}</strong>{" "}
            will be permanently deleted.
            {pendingDelete.status === "published" &&
              " It is currently live, so its page will stop working for anyone who has the link."}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}

function StatusPill({ post }: { post: StudioPost }) {
  const scheduled = isScheduled(post);
  const label = scheduled ? "Scheduled" : post.status === "published" ? "Published" : "Draft";
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-caption font-medium",
        scheduled && "bg-gold-soft text-ink",
        !scheduled && post.status === "published" && "bg-positive/15 text-positive",
        post.status === "draft" && "bg-surface-alt text-ink-muted",
      )}
    >
      {label}
    </span>
  );
}

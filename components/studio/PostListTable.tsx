"use client";

import Link from "next/link";
import { ListFilter } from "lucide-react";
import { useMemo, useState } from "react";
import {
  StudioEmpty,
  StudioFilterChip,
  studioSearch,
  studioTable,
  studioTableWrap,
  studioTd,
  studioTh,
} from "@/components/studio/chrome";
import { StudioStatusDot } from "@/components/studio/StudioPills";
import { StudioMetaTag, StudioRowMenu } from "@/components/studio/StudioRowMenu";
import { LinkButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import type { StudioPost } from "@/lib/api/studio";
import { useDeletePost } from "@/lib/queries/studio";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";

type StatusFilter = "all" | "published" | "draft" | "scheduled";

/** A published post dated in the future is scheduled, not yet live. */
function isScheduled(post: StudioPost): boolean {
  if (post.status !== "published" || !post.publishDate) return false;
  const at = Date.parse(post.publishDate);
  return Number.isFinite(at) && at > Date.now();
}

export function PostListTable({ posts }: { posts: StudioPost[] }) {
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
      <StudioEmpty
        title="No posts yet"
        action={
          <LinkButton href="/studio/new" size="sm">
            New post
          </LinkButton>
        }
      >
        Write your first article. It starts as a draft, so nothing goes live until you publish it.
      </StudioEmpty>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-caption font-medium text-ink">
          <ListFilter className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
          <span className="sr-only">Filter by status</span>
          <select
            aria-label="Filter by status"
            value={filter}
            onChange={(event) => setFilter(event.target.value as StatusFilter)}
            className="max-w-[9rem] bg-transparent text-caption text-ink focus:outline-none"
          >
            <option value="all">Add Filter</option>
            <option value="published">Published ({counts.published})</option>
            <option value="scheduled">Scheduled ({counts.scheduled})</option>
            <option value="draft">Draft ({counts.draft})</option>
          </select>
        </label>
        {filter !== "all" ? (
          <StudioFilterChip
            label="Status"
            value={filter === "published" ? "Published" : filter === "scheduled" ? "Scheduled" : "Draft"}
            onClear={() => setFilter("all")}
          />
        ) : null}
        {search.trim() ? (
          <StudioFilterChip label="Search" value={search.trim()} onClear={() => setSearch("")} />
        ) : null}
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search titles…"
          aria-label="Search posts by title"
          className={cn(studioSearch, "ml-auto")}
        />
      </div>

      {visible.length === 0 ? (
        <StudioEmpty title="No posts match">Try another status, or clear the search.</StudioEmpty>
      ) : (
        <div className={studioTableWrap}>
          <table className={cn(studioTable, "min-w-[44rem]")}>
            <thead>
              <tr>
                <th scope="col" className={studioTh}>
                  Post
                </th>
                <th scope="col" className={studioTh}>
                  Status
                </th>
                <th scope="col" className={studioTh}>
                  Category
                </th>
                <th scope="col" className={studioTh}>
                  Updated
                </th>
                <th scope="col" className={studioTh}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((post) => {
                const scheduled = isScheduled(post);
                const statusTone = scheduled
                  ? "gold"
                  : post.status === "published"
                    ? "positive"
                    : "muted";
                const statusLabel = scheduled ? "Scheduled" : post.status === "published" ? "Published" : "Draft";
                const actions = [
                  {
                    type: "link" as const,
                    label: "Edit",
                    href: `/studio/${encodeURIComponent(post.slug)}`,
                  },
                  {
                    type: "link" as const,
                    label: "Preview",
                    href: `/studio/${encodeURIComponent(post.slug)}/preview`,
                  },
                  ...(post.status === "published" && !scheduled
                    ? [
                        {
                          type: "link" as const,
                          label: "View live",
                          href: `/blog/${encodeURIComponent(post.slug)}`,
                        },
                      ]
                    : []),
                  {
                    type: "button" as const,
                    label: "Delete",
                    tone: "danger" as const,
                    onClick: () => setPendingDelete(post),
                  },
                ];
                return (
                  <tr key={post.id}>
                    <td className={studioTd}>
                      <Link
                        href={`/studio/${encodeURIComponent(post.slug)}`}
                        className="studio-cell-title hover:text-navy"
                      >
                        {post.title || "(untitled)"}
                      </Link>
                      <p className="studio-cell-meta">/{post.slug}</p>
                    </td>
                    <td className={studioTd}>
                      <StudioStatusDot label={statusLabel} tone={statusTone} />
                    </td>
                    <td className={studioTd}>
                      {post.categoryName ? (
                        <StudioMetaTag>{post.categoryName}</StudioMetaTag>
                      ) : (
                        <span className="text-ink-subtle">—</span>
                      )}
                    </td>
                    <td className={cn(studioTd, "whitespace-nowrap text-ink-muted")}>
                      {formatRelativeTime(post.updatedAt)}
                    </td>
                    <td className={studioTd}>
                      <StudioRowMenu actions={actions} label={`Actions for ${post.title || "post"}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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

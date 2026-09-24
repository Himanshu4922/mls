/**
 * Blog / research articles — mls-v2's `vlog` app.
 *
 * Powers the "Research & Insights" rail, the /blog index and post pages.
 *
 * Only the PUBLIC read surface is wired. `vlog/manage/` and category writes
 * exist but are `IsAdminUser` (staff-only CMS): that is a back-office console,
 * a different product surface from this consumer site, and HomeAtlasUI has no
 * reference design for it. See docs/API_GAPS.md.
 *
 * `/api/vlog/` returns a BARE ARRAY, not a DRF page envelope — verified against
 * the running backend — so every reader here tolerates both shapes.
 */

import { apiFetch, type RequestOptions } from "@/lib/api/client";

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnail: string | null;
  author: string | null;
  category: string | null;
  categorySlug: string | null;
  publishedAt: string | null;
  /** Last edit; feeds sitemap `lastModified` and BlogPosting `dateModified`. */
  updatedAt: string | null;
  /** Editor asked search engines not to index this post. */
  noindex: boolean;
  tags: string[];
}

export interface BlogPostDetail extends BlogPost {
  /** Rendered HTML from CKEditor, or Markdown-ish text on older rows. */
  content: string | null;
  /** A YouTube/Vimeo URL, or an uploaded file served by the backend. */
  videoUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  /** Editor-set canonical override (absolute URL), when the post is syndicated. */
  seoCanonicalUrl: string | null;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
}

interface RawPost {
  id: number;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  thumbnail_url?: string | null;
  author?: string | { name?: string } | null;
  category?: { id?: number; name?: string; title?: string; slug?: string } | string | null;
  published_at?: string | null;
  publish_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  seo_noindex?: boolean | null;
  seo_canonical_url?: string | null;
  tags?: string[] | string | null;
  embed_url?: string | null;
  video_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
}

function mapPost(raw: RawPost): BlogPost {
  const author =
    typeof raw.author === "string"
      ? raw.author
      : (raw.author?.name ?? null);
  const category =
    typeof raw.category === "string"
      ? raw.category
      : (raw.category?.name ?? raw.category?.title ?? null);

  const tags = Array.isArray(raw.tags)
    ? raw.tags
    : typeof raw.tags === "string"
      ? raw.tags.split(",")
      : [];

  return {
    id: raw.id,
    title: raw.title?.trim() || "Untitled",
    slug: raw.slug ?? String(raw.id),
    excerpt: raw.excerpt?.trim() || null,
    thumbnail: raw.thumbnail_url?.trim() || null,
    author: author?.trim() || null,
    category: category?.trim() || null,
    categorySlug:
      typeof raw.category === "object" ? (raw.category?.slug ?? null) : null,
    // `publish_date` is the scheduled date the serializer returns; the others
    // are older aliases kept so a mixed-vintage payload still dates correctly.
    publishedAt: raw.publish_date ?? raw.published_at ?? raw.created_at ?? null,
    updatedAt: raw.updated_at ?? null,
    noindex: raw.seo_noindex === true,
    tags: tags.map((t) => String(t).trim()).filter(Boolean),
  };
}

/** Both the bare array and a paged envelope, whichever the backend sends. */
function rowsOf(data: { results?: RawPost[] } | RawPost[]): RawPost[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

export async function getBlogPosts(
  limit = 3,
  options: RequestOptions = {},
): Promise<BlogPost[]> {
  const data = await apiFetch<
    { results?: RawPost[]; count?: number } | RawPost[]
  >("/api/vlog/", {
    revalidate: 1800,
    ...options,
    params: { limit, ...options.params },
  });

  return rowsOf(data).slice(0, limit).map(mapPost);
}

/**
 * The full published list for /blog. The endpoint is not paginated, so we sort
 * newest-first here rather than trusting arrival order.
 */
export async function getAllBlogPosts(
  options: RequestOptions = {},
): Promise<BlogPost[]> {
  const data = await apiFetch<{ results?: RawPost[] } | RawPost[]>("/api/vlog/", {
    revalidate: 900,
    ...options,
  });
  return rowsOf(data)
    .map(mapPost)
    .sort((a, b) => {
      const left = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const right = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return right - left;
    });
}

/** Public category list, used for the /blog filter chips. */
export async function getBlogCategories(
  options: RequestOptions = {},
): Promise<BlogCategory[]> {
  try {
    const data = await apiFetch<
      { results?: Array<{ id: number; name: string; slug: string }> } | Array<{ id: number; name: string; slug: string }>
    >("/api/vlog/categories/", { revalidate: 3600, ...options });
    const rows = Array.isArray(data) ? data : (data.results ?? []);
    return rows.filter((row) => row?.name);
  } catch {
    return [];
  }
}

export async function getBlogPost(
  slug: string,
  options: RequestOptions = {},
): Promise<BlogPostDetail | null> {
  try {
    const raw = await apiFetch<RawPost & { content?: string }>(
      `/api/vlog/${encodeURIComponent(slug)}/`,
      { revalidate: 1800, ...options },
    );
    return {
      ...mapPost(raw),
      content: raw.content ?? null,
      videoUrl: raw.video_url?.trim() || raw.embed_url?.trim() || null,
      seoTitle: raw.seo_title?.trim() || null,
      seoDescription: raw.seo_description?.trim() || null,
      seoCanonicalUrl: raw.seo_canonical_url?.trim() || null,
    };
  } catch {
    return null;
  }
}

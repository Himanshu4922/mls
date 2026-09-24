/**
 * Blog Studio — the authenticated authoring surface over mls-v2's `vlog` app.
 *
 * Distinct from `lib/api/blog.ts`, which is the PUBLIC read surface. Everything
 * here requires a Studio user (staff or `can_author`) and every call takes an
 * explicit access token, because these run server-side inside the `/api/studio/*`
 * proxy routes — the browser never holds a token.
 */

import { apiFetch, type RequestOptions } from "@/lib/api/client";

const VLOG = "/api/vlog";

export type PostStatus = "draft" | "published";

/** One FAQ entry; the model stores these as free-form JSON. */
export interface FaqItem {
  question: string;
  answer: string;
}

/** A post as the Studio sees it — drafts included, every field editable. */
export interface StudioPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: PostStatus;
  publishDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  author: string | null;
  categoryId: number | null;
  categoryName: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  videoUrl: string | null;
  embedUrl: string;
  allowComments: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  focusKeyword: string;
  seoCanonicalUrl: string;
  seoNoindex: boolean;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  faqItems: FaqItem[];
}

interface RawStudioPost {
  id: number;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  content?: string | null;
  status?: string;
  publish_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  author?: number | string | { name?: string; email?: string } | null;
  category?: { id?: number; name?: string } | null;
  tags?: string[] | string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  embed_url?: string | null;
  allow_comments?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  focus_keyword?: string | null;
  seo_canonical_url?: string | null;
  seo_noindex?: boolean;
  og_title?: string | null;
  og_description?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  faq_items?: unknown;
}

const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

function mapFaq(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        question: text(row.question).trim(),
        answer: text(row.answer).trim(),
      };
    })
    .filter((item): item is FaqItem => item !== null && (item.question !== "" || item.answer !== ""));
}

export function mapStudioPost(raw: RawStudioPost): StudioPost {
  const tags = Array.isArray(raw.tags)
    ? raw.tags
    : typeof raw.tags === "string"
      ? raw.tags.split(",")
      : [];

  // `author` is a bare user id on the write serializer's output and an object
  // elsewhere; show a name when we have one and fall back to nothing.
  const author =
    raw.author && typeof raw.author === "object"
      ? (raw.author.name ?? raw.author.email ?? null)
      : typeof raw.author === "string"
        ? raw.author
        : null;

  return {
    id: raw.id,
    title: text(raw.title),
    slug: text(raw.slug),
    excerpt: text(raw.excerpt),
    content: text(raw.content),
    status: raw.status === "published" ? "published" : "draft",
    publishDate: raw.publish_date ?? null,
    createdAt: raw.created_at ?? null,
    updatedAt: raw.updated_at ?? null,
    author,
    categoryId: raw.category?.id ?? null,
    categoryName: raw.category?.name ?? null,
    tags: tags.map((tag) => String(tag).trim()).filter(Boolean),
    thumbnailUrl: raw.thumbnail_url?.trim() || null,
    videoUrl: raw.video_url?.trim() || null,
    embedUrl: text(raw.embed_url),
    allowComments: raw.allow_comments !== false,
    seoTitle: text(raw.seo_title),
    seoDescription: text(raw.seo_description),
    seoKeywords: text(raw.seo_keywords),
    focusKeyword: text(raw.focus_keyword),
    seoCanonicalUrl: text(raw.seo_canonical_url),
    seoNoindex: Boolean(raw.seo_noindex),
    ogTitle: text(raw.og_title),
    ogDescription: text(raw.og_description),
    twitterTitle: text(raw.twitter_title),
    twitterDescription: text(raw.twitter_description),
    faqItems: mapFaq(raw.faq_items),
  };
}

/** Fields the editor can write. All optional so PATCH stays partial. */
export interface StudioPostInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  status?: PostStatus;
  publish_date?: string | null;
  category_id?: number | null;
  tags?: string;
  embed_url?: string;
  allow_comments?: boolean;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  focus_keyword?: string;
  seo_canonical_url?: string;
  seo_noindex?: boolean;
  og_title?: string;
  og_description?: string;
  twitter_title?: string;
  twitter_description?: string;
  faq_items?: FaqItem[];
}

function rowsOf(data: { results?: RawStudioPost[] } | RawStudioPost[]): RawStudioPost[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

/** Every post, drafts included. Newest activity first. */
export async function listStudioPosts(
  token: string,
  options: RequestOptions = {},
): Promise<StudioPost[]> {
  const data = await apiFetch<{ results?: RawStudioPost[] } | RawStudioPost[]>(
    `${VLOG}/manage/`,
    { ...options, token, cache: "no-store" },
  );
  return rowsOf(data)
    .map(mapStudioPost)
    .sort((a, b) => {
      const left = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const right = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return right - left;
    });
}

export async function getStudioPost(
  token: string,
  slug: string,
  options: RequestOptions = {},
): Promise<StudioPost> {
  const raw = await apiFetch<RawStudioPost>(
    `${VLOG}/manage/${encodeURIComponent(slug)}/`,
    { ...options, token, cache: "no-store" },
  );
  return mapStudioPost(raw);
}

export async function createStudioPost(
  token: string,
  input: StudioPostInput,
  options: RequestOptions = {},
): Promise<StudioPost> {
  const raw = await apiFetch<RawStudioPost>(`${VLOG}/manage/`, {
    ...options,
    method: "POST",
    token,
    body: input,
  });
  return mapStudioPost(raw);
}

export async function updateStudioPost(
  token: string,
  slug: string,
  input: StudioPostInput,
  options: RequestOptions = {},
): Promise<StudioPost> {
  const raw = await apiFetch<RawStudioPost>(
    `${VLOG}/manage/${encodeURIComponent(slug)}/`,
    { ...options, method: "PATCH", token, body: input },
  );
  return mapStudioPost(raw);
}

export async function deleteStudioPost(
  token: string,
  slug: string,
  options: RequestOptions = {},
): Promise<void> {
  await apiFetch<void>(`${VLOG}/manage/${encodeURIComponent(slug)}/`, {
    ...options,
    method: "DELETE",
    token,
  });
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export interface StudioCategory {
  id: number;
  name: string;
  slug: string;
}

export async function createCategory(
  token: string,
  name: string,
  options: RequestOptions = {},
): Promise<StudioCategory> {
  return apiFetch<StudioCategory>(`${VLOG}/categories/`, {
    ...options,
    method: "POST",
    token,
    body: { name },
  });
}

/* -------------------------------------------------------------------------- */
/* Team                                                                        */
/* -------------------------------------------------------------------------- */

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  isStaff: boolean;
  canAuthor: boolean;
  dateJoined: string | null;
}

interface RawTeamMember {
  id: number;
  name?: string;
  email?: string;
  is_staff?: boolean;
  can_author?: boolean;
  date_joined?: string | null;
}

const mapMember = (raw: RawTeamMember): TeamMember => ({
  id: raw.id,
  name: raw.name?.trim() || raw.email || "Unknown",
  email: raw.email ?? "",
  isStaff: Boolean(raw.is_staff),
  canAuthor: Boolean(raw.can_author),
  dateJoined: raw.date_joined ?? null,
});

export async function listTeam(
  token: string,
  options: RequestOptions = {},
): Promise<TeamMember[]> {
  const data = await apiFetch<RawTeamMember[] | { results?: RawTeamMember[] }>(
    `${VLOG}/team/`,
    { ...options, token, cache: "no-store" },
  );
  const rows = Array.isArray(data) ? data : (data.results ?? []);
  return rows.map(mapMember);
}

export async function grantTeamAccess(
  token: string,
  email: string,
  options: RequestOptions = {},
): Promise<TeamMember> {
  const raw = await apiFetch<RawTeamMember>(`${VLOG}/team/`, {
    ...options,
    method: "POST",
    token,
    body: { email },
  });
  return mapMember(raw);
}

export async function revokeTeamAccess(
  token: string,
  userId: number,
  options: RequestOptions = {},
): Promise<void> {
  await apiFetch<void>(`${VLOG}/team/${userId}/`, {
    ...options,
    method: "DELETE",
    token,
  });
}

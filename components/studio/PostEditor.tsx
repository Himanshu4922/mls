"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RichTextEditor } from "@/components/studio/RichTextEditor";
import { ConfirmDialog, PromptDialog } from "@/components/ui/Dialogs";
import type { FaqItem, StudioPost, StudioPostInput } from "@/lib/api/studio";
import type { BlogCategory } from "@/lib/api/blog";
import { useCreateCategory, useSavePost } from "@/lib/queries/studio";
import { cn } from "@/lib/utils/cn";
import { toArticleHtml, toPlainText } from "@/lib/utils/markdown";

/** Everything the form holds. Kept flat so change tracking stays simple. */
interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string;
  tags: string;
  embedUrl: string;
  status: "draft" | "published";
  publishDate: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  seoCanonicalUrl: string;
  seoNoindex: boolean;
  faqItems: FaqItem[];
}

function toFormState(post: StudioPost | null): FormState {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    // The editor works in HTML; a post stored as Markdown is converted on load
    // (and saved back as HTML the next time the author saves).
    content: toArticleHtml(post?.content),
    categoryId: post?.categoryId ? String(post.categoryId) : "",
    tags: post?.tags.join(", ") ?? "",
    embedUrl: post?.embedUrl ?? "",
    status: post?.status ?? "draft",
    // <input type="datetime-local"> wants `YYYY-MM-DDTHH:mm` in LOCAL time.
    publishDate: post?.publishDate ? toLocalInput(post.publishDate) : "",
    seoTitle: post?.seoTitle ?? "",
    seoDescription: post?.seoDescription ?? "",
    focusKeyword: post?.focusKeyword ?? "",
    seoCanonicalUrl: post?.seoCanonicalUrl ?? "",
    seoNoindex: post?.seoNoindex ?? false,
    faqItems: post?.faqItems ?? [],
  };
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Local datetime-local value back to an ISO instant the API can store. */
function toIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildPayload(form: FormState): StudioPostInput {
  return {
    title: form.title.trim(),
    slug: form.slug.trim() || undefined,
    excerpt: form.excerpt.trim(),
    content: form.content,
    category_id: form.categoryId ? Number(form.categoryId) : null,
    tags: form.tags.trim(),
    embed_url: form.embedUrl.trim(),
    status: form.status,
    publish_date: toIso(form.publishDate),
    seo_title: form.seoTitle.trim(),
    seo_description: form.seoDescription.trim(),
    focus_keyword: form.focusKeyword.trim(),
    seo_canonical_url: form.seoCanonicalUrl.trim(),
    seo_noindex: form.seoNoindex,
    faq_items: form.faqItems.filter((item) => item.question.trim() || item.answer.trim()),
  };
}

interface PostEditorProps {
  post: StudioPost | null;
  categories: BlogCategory[];
}

export function PostEditor({ post, categories }: PostEditorProps) {
  const router = useRouter();
  const isNew = post === null;

  const [form, setForm] = useState<FormState>(() => toFormState(post));
  const [categoryList, setCategoryList] = useState(categories);
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [updatedAt, setUpdatedAt] = useState(post?.updatedAt ?? null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  // mutateAsync is stable, so it can sit in `persist`'s deps without churning
  // the autosave effect below.
  const { mutateAsync: savePost, isPending: saving } = useSavePost();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  // Collapses the settings sidebar so the writing area takes the full width.
  const [showSidebar, setShowSidebar] = useState(true);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const { mutateAsync: createCategory, isPending: creatingCategory } = useCreateCategory();
  // Sampled once when the editor mounts. A lazy initializer runs outside the
  // render pass, so this is pure per React's rules while still giving the UI a
  // fixed "now" to compare dates against for this editing session.
  const [renderedAt] = useState(() => Date.now());

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  /** The one place that talks to the API, so every caller shares its rules. */
  const persist = useCallback(
    async (
      overrides: Partial<StudioPostInput> = {},
      { silent = false }: { silent?: boolean } = {},
    ): Promise<StudioPost | null> => {
      const payload = { ...buildPayload(form), ...overrides };
      if (!payload.title) {
        setError("Give the post a title before saving.");
        return null;
      }

      if (!silent) setError(null);

      try {
        const saved = await savePost({
          slug,
          // Only send the concurrency guard on updates, and only when we know
          // what we last saw.
          payload: slug && updatedAt ? { ...payload, expected_updated_at: updatedAt } : payload,
        });
        setSlug(saved.slug);
        setUpdatedAt(saved.updatedAt);
        setSavedAt(new Date());
        setDirty(false);

        // A new post gets a server-assigned slug; move to its real URL so a
        // refresh (or a second save) edits rather than creating a duplicate.
        if (isNew) {
          router.replace(`/studio/${encodeURIComponent(saved.slug)}`);
          router.refresh();
        }
        return saved;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save the post.");
        return null;
      }
    },
    [form, isNew, router, slug, updatedAt, savePost],
  );

  // Autosave — DRAFTS ONLY. Silently rewriting a live post as someone types is
  // how a half-edited article reaches readers, so a published post always takes
  // an explicit Save.
  const persistRef = useRef(persist);
  // Writing a ref during render is not safe under concurrent rendering; keep the
  // latest `persist` in an effect so the autosave timer never calls a stale one.
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);
  useEffect(() => {
    if (!dirty || form.status !== "draft" || !slug || !form.title.trim()) return;
    const timer = setTimeout(() => {
      void persistRef.current({}, { silent: true });
    }, 2500);
    return () => clearTimeout(timer);
  }, [dirty, form.status, form.title, slug]);

  // Warn before losing unsaved text to a tab close or a back button.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function addCategory(name: string) {
    setCategoryError(null);
    try {
      const category = await createCategory(name);
      setCategoryList((prev) => [...prev, category]);
      set("categoryId", String(category.id));
      setAddingCategory(false);
    } catch (caught) {
      setCategoryError(caught instanceof Error ? caught.message : "Could not create that category.");
    }
  }

  const scheduledFor = form.publishDate ? new Date(form.publishDate) : null;
  // Scheduling depends on the clock, and render must stay pure — so the clock is
  // read only in event handlers (`isFutureNow`), never while rendering.
  //
  // For the UI we can decide from state alone: a saved post that the SERVER
  // still reports as published is live; one with a future date the author has
  // just typed is treated as scheduled the moment they act on it.
  const publishAt = form.publishDate ? new Date(form.publishDate).getTime() : null;
  const isFuture = publishAt !== null && Number.isFinite(publishAt) && publishAt > renderedAt;
  const isLive = form.status === "published" && !isFuture;

  async function handlePublish() {
    // Stays open (spinning) while saving, so a failure is seen, not lost.
    const saved = await persist({ status: "published" });
    setConfirmPublish(false);
    if (saved) {
      setForm((prev) => ({ ...prev, status: "published" }));
      setNotice(
        isFuture
          ? `Scheduled. It will appear on the blog at ${scheduledFor?.toLocaleString("en-CA")}.`
          : "Published. It's live on the blog now.",
      );
    }
  }

  async function handleUnpublish() {
    const saved = await persist({ status: "draft" });
    if (saved) {
      setForm((prev) => ({ ...prev, status: "draft" }));
      setNotice("Moved back to draft. It's no longer visible on the blog.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Sticky action bar so Save is always reachable in a long post. It sits
          flush under the Studio header (the negative margins cancel <main>'s
          padding); a fixed height on lg lets the toolbar stick right below it. */}
      <div className="sticky top-0 z-20 -mx-4 -mt-6 flex flex-wrap items-center gap-3 border-b border-line bg-surface-alt/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:h-14 lg:flex-nowrap lg:px-8 lg:py-0">
        <Link href="/studio" className="text-caption text-ink-muted hover:text-navy">
          ← Posts
        </Link>

        <span className="text-caption text-ink-muted" aria-live="polite">
          {saving
            ? "Saving…"
            : dirty
              ? "Unsaved changes"
              : savedAt
                ? `Saved ${savedAt.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}`
                : ""}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSidebar((prev) => !prev)}
            aria-pressed={!showSidebar}
            aria-controls="post-settings"
            className="hidden rounded-control border border-line px-3 py-1.5 text-caption font-medium text-ink hover:border-navy hover:text-navy lg:inline-flex"
          >
            {showSidebar ? "Hide settings" : "Show settings"}
          </button>
          {slug && (
            <Link
              href={`/studio/${encodeURIComponent(slug)}/preview`}
              className="rounded-control border border-line px-3 py-1.5 text-caption font-medium text-ink hover:border-navy hover:text-navy"
            >
              Preview
            </Link>
          )}
          <button
            type="button"
            onClick={() => void persist()}
            disabled={saving}
            className="rounded-control border border-line px-3 py-1.5 text-caption font-medium text-ink disabled:opacity-60"
          >
            Save draft
          </button>
          {isLive || (form.status === "published" && isFuture) ? (
            <button
              type="button"
              onClick={() => void handleUnpublish()}
              disabled={saving}
              className="rounded-control border border-line px-3 py-1.5 text-caption font-medium text-ink disabled:opacity-60"
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmPublish(true)}
              disabled={saving}
              className="rounded-control bg-navy px-4 py-1.5 text-caption font-medium text-white disabled:opacity-60"
            >
              {isFuture ? "Schedule" : "Publish"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-control border border-negative/40 bg-surface px-4 py-2.5 text-small text-ink">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="flex flex-wrap items-center gap-2 rounded-control border border-positive/40 bg-surface px-4 py-2.5 text-small text-ink">
          {notice}
          {isLive && slug && (
            <Link href={`/blog/${encodeURIComponent(slug)}`} className="font-medium text-navy underline">
              View it
            </Link>
          )}
        </p>
      )}

      <div
        className={cn(
          "grid gap-6",
          showSidebar
            ? "lg:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]"
            : "mx-auto max-w-5xl",
        )}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Main column                                                      */}
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-4">
          <div>
            <label htmlFor="post-title" className="sr-only">Title</label>
            <input
              id="post-title"
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder="Post title"
              className="w-full rounded-surface border border-line bg-surface px-4 py-3 text-h2 text-ink placeholder:text-ink-subtle"
            />
          </div>

          <RichTextEditor
            value={form.content}
            onChange={(html) => set("content", html)}
            onUploadError={setError}
          />

          <Field
            label="Excerpt"
            hint="The summary shown on blog cards and in search results."
          >
            <textarea
              value={form.excerpt}
              onChange={(event) => set("excerpt", event.target.value)}
              rows={3}
              maxLength={300}
              className="w-full rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
            />
            <p className="mt-1 text-right text-caption text-ink-subtle">
              {form.excerpt.length}/300
            </p>
          </Field>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Sidebar                                                          */}
        {/* ---------------------------------------------------------------- */}
        {/* On wide screens the sidebar scrolls on its own, so every setting is
            reachable without losing your place in the post. */}
        <aside
          id="post-settings"
          className={cn(
            "space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1",
            !showSidebar && "lg:hidden",
          )}
        >
          <Panel title="Publishing">
            <Field label="Status">
              <p className="text-small text-ink">
                {isLive ? "Published — live now" : form.status === "published" && isFuture ? "Scheduled" : "Draft — not visible publicly"}
              </p>
            </Field>

            <Field
              label="Publish date"
              hint={
                isFuture
                  ? "In the future — the post stays hidden until then."
                  : "Leave empty to publish immediately."
              }
            >
              <input
                type="datetime-local"
                value={form.publishDate}
                onChange={(event) => set("publishDate", event.target.value)}
                className="w-full rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
              />
            </Field>

            <Field label="URL slug" hint={
              post?.status === "published"
                ? "Changing this breaks existing links to the post."
                : "Left empty, it's generated from the title."
            }>
              <input
                value={form.slug}
                onChange={(event) => set("slug", event.target.value)}
                placeholder={slug || "auto-generated"}
                className="w-full rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
              />
            </Field>
          </Panel>

          <Panel title="Organise">
            <Field label="Category">
              <div className="flex gap-2">
                <select
                  value={form.categoryId}
                  onChange={(event) => set("categoryId", event.target.value)}
                  className="w-full rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
                >
                  <option value="">No category</option>
                  {categoryList.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryError(null);
                    setAddingCategory(true);
                  }}
                  title="Add a category"
                  className="rounded-control border border-line px-3 text-small text-ink hover:border-navy"
                >
                  +
                </button>
              </div>
            </Field>

            <Field label="Tags" hint="Comma-separated.">
              <input
                value={form.tags}
                onChange={(event) => set("tags", event.target.value)}
                placeholder="market, toronto"
                className="w-full rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
              />
            </Field>

            <Field label="Video URL" hint="YouTube or Vimeo link, shown above the article.">
              <input
                value={form.embedUrl}
                onChange={(event) => set("embedUrl", event.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                className="w-full rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
              />
            </Field>
          </Panel>

          <Panel
            title="SEO"
            action={
              <button
                type="button"
                onClick={() => setShowSeo((prev) => !prev)}
                className="text-caption text-navy hover:underline"
              >
                {showSeo ? "Hide" : "Edit"}
              </button>
            }
          >
            {/* A live preview of the Google result, so the counts mean something. */}
            <div className="rounded-control border border-line bg-surface-alt p-3">
              <p className="truncate text-small text-navy">
                {form.seoTitle || form.title || "Post title"}
              </p>
              <p className="truncate text-caption text-positive">
                /blog/{form.slug || slug || "post-slug"}
              </p>
              <p className="line-clamp-2 text-caption text-ink-muted">
                {form.seoDescription || toPlainText(form.excerpt) || "Add an excerpt or SEO description."}
              </p>
            </div>

            {showSeo && (
              <div className="mt-3 space-y-3">
                <Field label="SEO title" hint="Around 60 characters works best.">
                  <input
                    value={form.seoTitle}
                    onChange={(event) => set("seoTitle", event.target.value)}
                    className="w-full rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
                  />
                  <Counter value={form.seoTitle.length} max={60} />
                </Field>

                <Field label="Meta description" hint="Around 155 characters works best.">
                  <textarea
                    value={form.seoDescription}
                    onChange={(event) => set("seoDescription", event.target.value)}
                    rows={3}
                    className="w-full rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
                  />
                  <Counter value={form.seoDescription.length} max={155} />
                </Field>

                <Field label="Focus keyword">
                  <input
                    value={form.focusKeyword}
                    onChange={(event) => set("focusKeyword", event.target.value)}
                    className="w-full rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
                  />
                </Field>

                <Field label="Canonical URL" hint="Only if this was published elsewhere first.">
                  <input
                    value={form.seoCanonicalUrl}
                    onChange={(event) => set("seoCanonicalUrl", event.target.value)}
                    className="w-full rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
                  />
                </Field>

                <label className="flex items-start gap-2 text-small text-ink">
                  <input
                    type="checkbox"
                    checked={form.seoNoindex}
                    onChange={(event) => set("seoNoindex", event.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Hide from search engines
                    <span className="block text-caption text-ink-muted">
                      The post stays readable at its URL.
                    </span>
                  </span>
                </label>
              </div>
            )}
          </Panel>

          <FaqPanel
            items={form.faqItems}
            onChange={(items) => set("faqItems", items)}
          />
        </aside>
      </div>

      <ConfirmDialog
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        onConfirm={() => void handlePublish()}
        title={isFuture ? "Schedule this post?" : "Publish this post?"}
        confirmLabel={isFuture ? "Schedule" : "Publish now"}
        busy={saving}
      >
        {isFuture ? (
          <p>
            It will appear on the blog at{" "}
            <strong className="text-ink">{scheduledFor?.toLocaleString("en-CA")}</strong>{" "}
            and stay hidden until then.
          </p>
        ) : (
          <p>
            It will be live immediately at{" "}
            <strong className="text-ink">/blog/{form.slug || slug || "…"}</strong>{" "}
            and visible to anyone.
          </p>
        )}
      </ConfirmDialog>

      <PromptDialog
        open={addingCategory}
        onClose={() => setAddingCategory(false)}
        onSubmit={(name) => void addCategory(name)}
        title="New category"
        description="It's selected for this post and available on every post after."
        label="Category name"
        placeholder="e.g. Market reports"
        submitLabel="Add category"
        busy={creatingCategory}
        error={categoryError}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Small building blocks                                                      */
/* -------------------------------------------------------------------------- */

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-surface border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-small font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-caption font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-caption text-ink-muted">{hint}</span>}
    </label>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span
      className={cn(
        "mt-1 block text-right text-caption",
        value > max ? "text-negative" : "text-ink-subtle",
      )}
    >
      {value}/{max}
    </span>
  );
}

function FaqPanel({
  items,
  onChange,
}: {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
}) {
  return (
    <Panel
      title="FAQ"
      action={
        <button
          type="button"
          onClick={() => onChange([...items, { question: "", answer: "" }])}
          className="text-caption text-navy hover:underline"
        >
          Add
        </button>
      }
    >
      {items.length === 0 ? (
        <p className="text-caption text-ink-muted">
          Optional question-and-answer pairs shown with the article.
        </p>
      ) : (
        items.map((item, index) => (
          <div key={index} className="space-y-2 rounded-control border border-line p-3">
            <input
              value={item.question}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...item, question: event.target.value };
                onChange(next);
              }}
              placeholder="Question"
              className="w-full rounded-control border border-line bg-surface px-3 py-1.5 text-small text-ink"
            />
            <textarea
              value={item.answer}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...item, answer: event.target.value };
                onChange(next);
              }}
              placeholder="Answer"
              rows={2}
              className="w-full rounded-control border border-line bg-surface px-3 py-1.5 text-small text-ink"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="text-caption text-negative hover:underline"
            >
              Remove
            </button>
          </div>
        ))
      )}
    </Panel>
  );
}

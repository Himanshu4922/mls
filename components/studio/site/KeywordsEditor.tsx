"use client";

import { useState } from "react";
import { DocumentEditor } from "@/components/studio/site/DocumentEditor";
import { TextControl } from "@/components/studio/site/fields";
import { Button } from "@/components/ui/Button";
import {
  CURATED_GROUPS,
  curatedPath,
  type CuratedDocument,
  type CuratedGroup,
  type CuratedPage,
} from "@/lib/seo/curatedPages";
import { SEARCH_PROPERTY_TYPES } from "@/lib/types/domain";
import { validateCurated, type FieldErrors } from "@/lib/site/validate";
import { cn } from "@/lib/utils/cn";

function emptyPage(): CuratedPage {
  return {
    slug: "",
    label: "",
    h1: "",
    description: "",
    group: "Deals",
    query: { status: "Active" },
    enabled: true,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function KeywordsEditor() {
  return (
    <DocumentEditor
      siteKey="curated"
      title="Keyword searches"
      lede="These chips power the homepage “Search by keywords” block, /homes pages, and the site map. Edit the label, URL slug, and search filters, then publish. City pages (Condos in Toronto, …) stay automatic."
      validate={validateCurated}
      previewOf={(draft) => ({ kind: "curated", document: draft })}
    >
      {(draft, update, errors) => (
        <KeywordsForm
          document={draft as CuratedDocument}
          errors={errors}
          onChange={(next) => update(next)}
        />
      )}
    </DocumentEditor>
  );
}

function KeywordsForm({
  document,
  errors,
  onChange,
}: {
  document: CuratedDocument;
  errors: FieldErrors;
  onChange: (next: CuratedDocument) => void;
}) {
  const pages = Array.isArray(document.pages) ? document.pages : [];
  const [openIndex, setOpenIndex] = useState<number | null>(pages.length ? 0 : null);

  function setPages(next: CuratedPage[]) {
    onChange({ pages: next });
  }

  function patch(index: number, patch: Partial<CuratedPage>) {
    setPages(pages.map((page, i) => (i === index ? { ...page, ...patch } : page)));
  }

  function patchQuery(index: number, queryPatch: CuratedPage["query"]) {
    const page = pages[index];
    if (!page) return;
    patch(index, { query: { ...page.query, ...queryPatch } });
  }

  function addPage() {
    const next = [...pages, emptyPage()];
    setPages(next);
    setOpenIndex(next.length - 1);
  }

  function removePage(index: number) {
    const next = pages.filter((_, i) => i !== index);
    setPages(next);
    setOpenIndex((current) => {
      if (current === null) return null;
      if (current === index) return next.length ? Math.min(index, next.length - 1) : null;
      if (current > index) return current - 1;
      return current;
    });
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= pages.length) return;
    const next = [...pages];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    setPages(next);
    setOpenIndex(target);
  }

  return (
    <div className="space-y-4">
      {errors.pages ? <p className="text-small text-red-700">{errors.pages}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-muted">
          {pages.length} search{pages.length === 1 ? "" : "es"}. Disabled rows stay in the draft but
          do not appear on the public site.
        </p>
        <Button type="button" variant="secondary" onClick={addPage}>
          Add search
        </Button>
      </div>

      {pages.length === 0 ? (
        <p className="rounded-control border border-dashed border-line px-4 py-8 text-center text-small text-ink-muted">
          No searches yet. Add one, or discard the draft to restore the shipped defaults.
        </p>
      ) : (
        <ul className="space-y-3">
          {pages.map((page, index) => {
            const open = openIndex === index;
            const keywordsText = (page.query.keywords ?? []).join(", ");
            return (
              <li
                key={`${page.slug || "new"}-${index}`}
                className={cn(
                  "overflow-hidden rounded-surface border border-line bg-surface shadow-card",
                  page.enabled === false && "opacity-70",
                )}
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setOpenIndex(open ? null : index)}
                  >
                    <span className="block truncate text-small font-medium text-ink">
                      {page.label || "Untitled search"}
                    </span>
                    <span className="block truncate text-caption text-ink-muted">
                      {page.group}
                      {page.slug ? ` · /homes/${page.slug}` : ""}
                      {page.enabled === false ? " · hidden" : ""}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)}>
                      Up
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={index === pages.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      Down
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => removePage(index)}>
                      Remove
                    </Button>
                  </div>
                </div>

                {open ? (
                  <div className="grid gap-4 p-4 sm:grid-cols-2">
                    <FieldControl
                      label="Chip label"
                      value={page.label}
                      max={60}
                      error={errors[`pages.${index}.label`]}
                      onChange={(label) => {
                        const next: Partial<CuratedPage> = { label };
                        if (!page.slug) next.slug = slugify(label);
                        if (!page.h1) next.h1 = label;
                        patch(index, next);
                      }}
                    />
                    <FieldControl
                      label="URL slug"
                      value={page.slug}
                      max={80}
                      hint="Lowercase letters, numbers, hyphens. Becomes /homes/…"
                      error={errors[`pages.${index}.slug`]}
                      onChange={(slug) => patch(index, { slug: slugify(slug) })}
                    />
                    <FieldControl
                      label="Page title (H1)"
                      value={page.h1}
                      max={100}
                      error={errors[`pages.${index}.h1`]}
                      onChange={(h1) => patch(index, { h1 })}
                    />
                    <label className="block text-caption text-ink-muted">
                      Group
                      <select
                        className="mt-1 block h-10 w-full rounded-control border border-line bg-surface px-3 text-small text-ink"
                        value={page.group}
                        onChange={(event) => patch(index, { group: event.target.value as CuratedGroup })}
                      >
                        {CURATED_GROUPS.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                      {errors[`pages.${index}.group`] ? (
                        <span className="mt-1 block text-red-700">{errors[`pages.${index}.group`]}</span>
                      ) : null}
                    </label>
                    <div className="sm:col-span-2">
                      <FieldControl
                        label="Description"
                        value={page.description}
                        max={240}
                        multiline
                        error={errors[`pages.${index}.description`]}
                        onChange={(description) => patch(index, { description })}
                      />
                    </div>

                    <label className="block text-caption text-ink-muted">
                      Transaction
                      <select
                        className="mt-1 block h-10 w-full rounded-control border border-line bg-surface px-3 text-small text-ink"
                        value={page.query.transaction ?? ""}
                        onChange={(event) =>
                          patchQuery(index, {
                            transaction: (event.target.value || undefined) as CuratedPage["query"]["transaction"],
                          })
                        }
                      >
                        <option value="">Sale (default)</option>
                        <option value="sale">Sale</option>
                        <option value="rent">Rent</option>
                      </select>
                    </label>
                    <label className="block text-caption text-ink-muted">
                      Property type
                      <select
                        className="mt-1 block h-10 w-full rounded-control border border-line bg-surface px-3 text-small text-ink"
                        value={page.query.type ?? ""}
                        onChange={(event) =>
                          patchQuery(index, { type: event.target.value || undefined })
                        }
                      >
                        <option value="">Any</option>
                        {SEARCH_PROPERTY_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>
                    <FieldControl
                      label="Status"
                      value={page.query.status ?? ""}
                      max={40}
                      hint="Usually Active. Leave blank for any."
                      error={errors[`pages.${index}.query.status`]}
                      onChange={(status) => patchQuery(index, { status: status || undefined })}
                    />
                    <FieldControl
                      label="City"
                      value={page.query.city ?? ""}
                      max={80}
                      error={errors[`pages.${index}.query.city`]}
                      onChange={(city) => patchQuery(index, { city: city || undefined })}
                    />
                    <FieldControl
                      label="Min price"
                      value={page.query.priceMin != null ? String(page.query.priceMin) : ""}
                      max={12}
                      error={errors[`pages.${index}.query.priceMin`]}
                      onChange={(value) =>
                        patchQuery(index, {
                          priceMin: value.trim() ? Number(value.replace(/\D/g, "")) || undefined : undefined,
                        })
                      }
                    />
                    <FieldControl
                      label="Max price"
                      value={page.query.priceMax != null ? String(page.query.priceMax) : ""}
                      max={12}
                      error={errors[`pages.${index}.query.priceMax`]}
                      onChange={(value) =>
                        patchQuery(index, {
                          priceMax: value.trim() ? Number(value.replace(/\D/g, "")) || undefined : undefined,
                        })
                      }
                    />
                    <FieldControl
                      label="Min bedrooms"
                      value={page.query.bedsMin != null ? String(page.query.bedsMin) : ""}
                      max={2}
                      error={errors[`pages.${index}.query.bedsMin`]}
                      onChange={(value) =>
                        patchQuery(index, {
                          bedsMin: value.trim() ? Number(value.replace(/\D/g, "")) || undefined : undefined,
                        })
                      }
                    />
                    <label className="flex items-center gap-2 pt-6 text-small text-ink">
                      <input
                        type="checkbox"
                        checked={page.query.openHouse === true}
                        onChange={(event) =>
                          patchQuery(index, { openHouse: event.target.checked ? true : undefined })
                        }
                      />
                      Open house only
                    </label>
                    <div className="sm:col-span-2">
                      <FieldControl
                        label="Description keywords"
                        value={keywordsText}
                        max={600}
                        multiline
                        hint="Comma-separated phrases matched in listing remarks (OR). Leave blank for filter-only searches."
                        error={errors[`pages.${index}.query.keywords`]}
                        onChange={(value) => {
                          const keywords = value
                            .split(",")
                            .map((part) => part.trim())
                            .filter(Boolean);
                          patchQuery(index, { keywords: keywords.length ? keywords : undefined });
                        }}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-small text-ink sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={page.enabled !== false}
                        onChange={(event) => patch(index, { enabled: event.target.checked })}
                      />
                      Show on the public site
                    </label>
                    {page.slug ? (
                      <p className="text-caption text-ink-muted sm:col-span-2">
                        Public URL after publish:{" "}
                        <a className="text-navy underline" href={curatedPath(page)} target="_blank" rel="noreferrer">
                          {curatedPath(page)}
                        </a>
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

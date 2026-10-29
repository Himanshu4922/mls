"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { StudioAlert, StudioEmpty, StudioPage } from "@/components/studio/chrome";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { EditorialListSkeleton } from "@/components/studio/StudioSkeletons";
import { useUserKeys } from "@/components/providers/AuthProvider";
import { fetchJson, HttpError } from "@/lib/queries/fetcher";
import { useEditorialList, type EditorialBody } from "@/lib/queries/siteStudio";

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  label: "Short tag",
  icon: "Icon",
  amount_text: "Amount shown",
  description: "Description",
  source_url: "Official source link",
  reviewed_at: "Last checked",
  is_active: "Show on the site",
  display_order: "Order on the page",
  name: "Name",
  category: "Category",
  website_url: "Website",
  logo_url: "Logo image",
  city_key: "City key",
  city_label: "City name",
  image_url: "Photo",
  credit: "Photo credit",
  source: "Source",
  url: "Article link",
  is_hidden: "Hide from the homepage",
};

const FIELD_HINTS: Record<string, string> = {
  city_key: "Lowercase city name, such as mississauga or richmond hill. The tile uses this to find the photo.",
  display_order: "1 shows first. Existing rows keep their place when you add a new one.",
  reviewed_at: "Use a date like 2026-10-10, or leave it blank.",
  is_active: "Turn this off to keep the row here without showing it to visitors.",
  is_hidden: "Hidden headlines leave the homepage. The feed can still bring them back in.",
  image_url: "Upload a photo or paste an image link. At least 800×450 pixels.",
  logo_url: "Upload a logo or paste an image link.",
  url: "Full https link visitors open from the Daily News card.",
  icon: "Pick the glyph shown on the homepage card.",
};

const IMAGE_FIELDS = new Set(["image_url", "logo_url"]);

const INCENTIVE_ICONS = [
  { value: "home", label: "Home" },
  { value: "savings", label: "Savings" },
  { value: "green", label: "Green" },
  { value: "construction", label: "Construction" },
  { value: "equity", label: "Equity" },
  { value: "retirement", label: "Retirement" },
] as const;

type EditorialRow = {
  /** Stable id used in PATCH/DELETE URLs — never changes while editing. */
  saveId: string;
  data: Record<string, unknown>;
};

function toRows(list: Array<Record<string, unknown>>, idKey: string): EditorialRow[] {
  return list.map((data) => ({ saveId: String(data[idKey] ?? ""), data: { ...data } }));
}

function buildSaveBody(_resource: string, row: Record<string, unknown>, fields: string[]) {
  const body: Record<string, unknown> = {};
  for (const field of fields) {
    if (!(field in row)) continue;
    if (field === "display_order") {
      body.display_order = Number(row.display_order) || 0;
    } else if (field === "reviewed_at") {
      const raw = row.reviewed_at;
      body.reviewed_at = raw ? String(raw).slice(0, 10) : null;
    } else if (
      field === "source_url" ||
      field === "website_url" ||
      field === "logo_url" ||
      field === "url" ||
      field === "image_url"
    ) {
      // URLField(blank=True) rejects null; empty string is the stored blank.
      body[field] = row[field] == null ? "" : String(row[field]).trim();
    } else if (field === "is_active" || field === "is_hidden") {
      body[field] = Boolean(row[field]);
    } else {
      body[field] = row[field];
    }
  }
  return body;
}

function errorMessage(caught: unknown, fallback: string): string {
  if (caught instanceof HttpError) {
    const fields = Object.entries(caught.fieldErrors);
    if (fields.length > 0) {
      return fields.map(([key, message]) => `${FIELD_LABELS[key] || key}: ${message}`).join(" ");
    }
    return caught.message || fallback;
  }
  return caught instanceof Error ? caught.message : fallback;
}

function nextCreateBody(
  createBody: Record<string, unknown>,
  existing: EditorialRow[],
): Record<string, unknown> {
  const body = { ...createBody };
  const orders = existing.map((item) => Number(item.data.display_order) || 0);
  const nextOrder = orders.length > 0 ? Math.max(...orders) + 1 : 0;
  if ("display_order" in body) body.display_order = nextOrder;
  if ("is_active" in body) body.is_active = true;

  if (typeof body.title === "string" && body.title === "New program") {
    const n = existing.filter((item) => String(item.data.title || "").startsWith("New program")).length;
    body.title = n === 0 ? "New program" : `New program ${n + 1}`;
  }
  if (typeof body.name === "string" && body.name === "New partner") {
    const n = existing.filter((item) => String(item.data.name || "").startsWith("New partner")).length;
    body.name = n === 0 ? "New partner" : `New partner ${n + 1}`;
  }
  if (typeof body.city_key === "string" && body.city_key === "new-city") {
    const n = existing.filter((item) => String(item.data.city_key || "").startsWith("new-city")).length;
    const key = n === 0 ? "new-city" : `new-city-${n + 1}`;
    body.city_key = key;
    body.city_label = n === 0 ? "New city" : `New city ${n + 1}`;
  }
  if (typeof body.title === "string" && body.title === "New headline") {
    const n = existing.filter((item) => String(item.data.title || "").startsWith("New headline")).length;
    body.title = n === 0 ? "New headline" : `New headline ${n + 1}`;
  }
  return body;
}

export function EditorialManager({
  resource,
  title,
  lede,
  rows,
  idKey,
  fields,
  createBody,
}: {
  resource: string;
  title: string;
  lede: string;
  rows: Array<Record<string, unknown>>;
  idKey: string;
  fields: string[];
  createBody?: Record<string, unknown>;
}) {
  const keys = useUserKeys();
  const queryClient = useQueryClient();
  const list = useEditorialList(resource, rows);
  const serverRows = list.data?.results ?? rows;
  const [items, setItems] = useState(() => toRows(rows, idKey));
  const [seenAt, setSeenAt] = useState(list.dataUpdatedAt);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Sync clean rows from the server; leave in-progress edits alone.
  if (list.dataUpdatedAt !== seenAt) {
    setSeenAt(list.dataUpdatedAt);
    setItems((current) => {
      const server = toRows(serverRows, idKey);
      if (dirtyIds.size === 0) return server;
      const dirty = new Map(current.filter((item) => dirtyIds.has(item.saveId)).map((item) => [item.saveId, item]));
      return server.map((item) => dirty.get(item.saveId) ?? item);
    });
  }

  function patchItem(saveId: string, field: string, value: unknown) {
    setDirtyIds((current) => new Set(current).add(saveId));
    setNotice(null);
    setItems((current) =>
      current.map((item) =>
        item.saveId === saveId ? { ...item, data: { ...item.data, [field]: value } } : item,
      ),
    );
  }

  async function loadLatest(): Promise<EditorialRow[]> {
    if (!keys) {
      const data = await fetchJson<EditorialBody>(`/api/studio/editorial/${resource}`, {
        cache: "no-store",
        fallback: "Could not load this list.",
      });
      return toRows(data.results ?? [], idKey);
    }
    const data = await queryClient.fetchQuery({
      queryKey: keys.editorial(resource),
      queryFn: ({ signal }) =>
        fetchJson<EditorialBody>(`/api/studio/editorial/${resource}`, {
          signal,
          cache: "no-store",
          fallback: "Could not load this list.",
        }),
    });
    return toRows(data.results ?? [], idKey);
  }

  async function save(item: EditorialRow) {
    if (!item.saveId) {
      setError("This row has no id yet. Refresh the page and try again.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fetchJson(`/api/studio/editorial/${resource}/${encodeURIComponent(item.saveId)}`, {
        method: "PATCH",
        body: buildSaveBody(resource, item.data, fields),
        fallback: "Could not save that.",
      });
      const latest = await loadLatest();
      setDirtyIds((current) => {
        const next = new Set(current);
        next.delete(item.saveId);
        return next;
      });
      setItems(latest);
      setNotice("Saved. The public site will show this on the next refresh.");
    } catch (caught) {
      setError(errorMessage(caught, "Could not save that."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: EditorialRow) {
    if (!item.saveId) {
      setError("This row has no id yet. Refresh the page and try again.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fetch(`/api/studio/editorial/${resource}/${encodeURIComponent(item.saveId)}`, { method: "DELETE" });
      const latest = await loadLatest();
      setDirtyIds((current) => {
        const next = new Set(current);
        next.delete(item.saveId);
        return next;
      });
      setItems(latest);
      setNotice("Removed from the public page.");
    } catch (caught) {
      setError(errorMessage(caught, "Could not delete that."));
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!createBody) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fetchJson(`/api/studio/editorial/${resource}`, {
        method: "POST",
        body: nextCreateBody(createBody, items),
        fallback: "Could not create that.",
      });
      const latest = await loadLatest();
      setItems(latest);
      setDirtyIds(new Set());
      setNotice("Added. Edit the new row below, then Save.");
    } catch (caught) {
      setError(errorMessage(caught, "Could not create that."));
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(item: EditorialRow, field: string, file: File) {
    setUploadingId(item.saveId);
    setError(null);
    if (file.size > 8 * 1024 * 1024) {
      setError("Images must be 8 MB or smaller.");
      setUploadingId(null);
      return;
    }
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) {
      setError("Upload a JPEG, PNG, or WebP image.");
      setUploadingId(null);
      return;
    }
    if (bitmap.width < 800 || bitmap.height < 450) {
      setError("Use an image at least 800×450 pixels so it stays sharp on the site.");
      bitmap.close();
      setUploadingId(null);
      return;
    }
    bitmap.close();
    const body = new FormData();
    body.append("file", file);
    body.append("role", "section");
    try {
      const data = await fetchJson<{ url: string }>("/api/studio/site/media", {
        method: "POST",
        body,
        fallback: "Could not upload that image.",
      });
      patchItem(item.saveId, field, data.url);
    } catch (caught) {
      setError(errorMessage(caught, "Could not upload that image."));
    } finally {
      setUploadingId(null);
    }
  }

  if (list.isPending && !list.data) return <EditorialListSkeleton />;

  return (
    <StudioPage
      kicker="Editorial"
      title={title}
      description={lede}
      actions={
        createBody ? (
          <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => void create()}>
            Add new
          </Button>
        ) : null
      }
    >
      {error && <StudioAlert>{error}</StudioAlert>}
      {notice && (
        <p role="status" className="rounded-control border border-positive/40 bg-surface px-4 py-2.5 text-small text-ink">
          {notice}
        </p>
      )}
      {items.length === 0 && <StudioEmpty title="Nothing here yet" />}
      <ul className="space-y-4">
        {items.map((item) => {
          const row = item.data;
          const heading = String(row.title || row.name || row.city_label || "Untitled");
          const dirty = dirtyIds.has(item.saveId);
          return (
            <li key={item.saveId || heading} className="overflow-hidden rounded-surface border border-line bg-surface">
              <div className="border-b border-line bg-navy-tint/60 px-5 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-h3 text-ink">{heading}</h2>
                  {dirty ? <span className="text-caption text-ink-muted">Unsaved changes</span> : null}
                </div>
                {resource === "news" && row.source ? <p className="mt-0.5 text-small text-ink-muted">{String(row.source)}</p> : null}
              </div>
              <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => {
                  if (resource === "news" && field !== "is_hidden") return null;
                  const label = FIELD_LABELS[field] || field;
                  if (typeof row[field] === "boolean") {
                    return (
                      <label key={field} className="flex items-center justify-between gap-4 rounded-control border border-line px-4 py-3 sm:col-span-2">
                        <span>
                          <span className="block text-small font-medium text-ink">{label}</span>
                          {FIELD_HINTS[field] && <span className="mt-0.5 block text-caption text-ink-muted">{FIELD_HINTS[field]}</span>}
                        </span>
                        <Switch
                          aria-label={label}
                          checked={Boolean(row[field])}
                          onCheckedChange={(checked) => patchItem(item.saveId, field, checked)}
                        />
                      </label>
                    );
                  }
                  if (field === "icon" && resource === "incentives") {
                    return (
                      <label key={field} className="block text-small font-medium text-ink">
                        {label}
                        <select
                          className="mt-1.5 w-full rounded-control border border-line bg-surface px-3 py-2 font-normal text-ink"
                          value={row[field] == null ? "home" : String(row[field])}
                          onChange={(event) => patchItem(item.saveId, field, event.target.value)}
                        >
                          {INCENTIVE_ICONS.map((icon) => (
                            <option key={icon.value} value={icon.value}>
                              {icon.label}
                            </option>
                          ))}
                        </select>
                        {FIELD_HINTS[field] && <span className="mt-1 block font-normal text-caption text-ink-muted">{FIELD_HINTS[field]}</span>}
                      </label>
                    );
                  }
                  if (IMAGE_FIELDS.has(field)) {
                    const url = row[field] == null ? "" : String(row[field]);
                    const uploading = uploadingId === item.saveId;
                    return (
                      <div key={field} className="space-y-2 sm:col-span-2">
                        <label className="block text-small font-medium text-ink">
                          {label}
                          <Input
                            className="mt-1.5 font-normal"
                            value={url}
                            placeholder="https://…"
                            onChange={(event) => patchItem(item.saveId, field, event.target.value)}
                          />
                        </label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="block text-caption text-ink-muted"
                          disabled={busy || uploading}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) void uploadImage(item, field, file);
                          }}
                        />
                        {FIELD_HINTS[field] && <p className="text-caption text-ink-muted">{FIELD_HINTS[field]}</p>}
                        {uploading && <p className="text-caption text-ink-muted">Uploading…</p>}
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary CMS URLs
                          <img src={url} alt="" className="mt-1 h-28 w-full max-w-xs rounded-control object-cover" />
                        ) : null}
                      </div>
                    );
                  }
                  const wide = field === "description" || field === "source_url" || field === "website_url";
                  return (
                    <label key={field} className={`block text-small font-medium text-ink ${wide ? "sm:col-span-2" : ""}`}>
                      {label}
                      <Input
                        className="mt-1.5 font-normal"
                        value={row[field] == null ? "" : String(row[field])}
                        onChange={(event) => patchItem(item.saveId, field, event.target.value)}
                      />
                      {FIELD_HINTS[field] && <span className="mt-1 block font-normal text-caption text-ink-muted">{FIELD_HINTS[field]}</span>}
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2 border-t border-line pt-4">
                <Button type="button" variant="secondary" disabled={busy || uploadingId === item.saveId} onClick={() => void save(item)}>
                  Save
                </Button>
                {resource !== "news" && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Remove “${heading}”? It will leave the public page.`)) void remove(item);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
              </div>
            </li>
          );
        })}
      </ul>
    </StudioPage>
  );
}

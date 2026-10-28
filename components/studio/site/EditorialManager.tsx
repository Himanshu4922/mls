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
import { useEditorialList } from "@/lib/queries/siteStudio";

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
  is_hidden: "Hide from the homepage",
};

const FIELD_HINTS: Record<string, string> = {
  city_key: "Lowercase city name, such as mississauga or richmond hill. The tile uses this to find the photo.",
  display_order: "1 shows first.",
  reviewed_at: "Use a date like 2026-10-10, or leave it blank.",
  is_active: "Turn this off to keep the row here without showing it to visitors.",
  is_hidden: "Hidden headlines leave the homepage. The feed can still bring them back in.",
  image_url: "Upload a photo or paste an image link. At least 800×450 pixels.",
  logo_url: "Upload a logo or paste an image link.",
};

const IMAGE_FIELDS = new Set(["image_url", "logo_url"]);

type EditorialRow = {
  /** Stable id used in PATCH/DELETE URLs — never changes while editing. */
  saveId: string;
  data: Record<string, unknown>;
};

function toRows(list: Array<Record<string, unknown>>, idKey: string): EditorialRow[] {
  return list.map((data) => ({ saveId: String(data[idKey] ?? ""), data: { ...data } }));
}

function buildSaveBody(resource: string, row: Record<string, unknown>, fields: string[]) {
  if (resource === "news") return { is_hidden: Boolean(row.is_hidden) };
  const body: Record<string, unknown> = {};
  for (const field of fields) {
    if (!(field in row)) continue;
    if (field === "display_order") {
      body.display_order = Number(row.display_order) || 0;
    } else if (field === "reviewed_at") {
      body.reviewed_at = row.reviewed_at ? String(row.reviewed_at).slice(0, 10) : null;
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
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Sync from the server after saves/refreshes, but never wipe in-progress edits.
  if (list.dataUpdatedAt !== seenAt) {
    setSeenAt(list.dataUpdatedAt);
    if (!dirty) setItems(toRows(serverRows, idKey));
  }

  function patchItem(saveId: string, field: string, value: unknown) {
    setDirty(true);
    setItems((current) =>
      current.map((item) =>
        item.saveId === saveId ? { ...item, data: { ...item.data, [field]: value } } : item,
      ),
    );
  }

  async function refresh() {
    if (keys) await queryClient.invalidateQueries({ queryKey: keys.editorial(resource) });
  }

  async function save(item: EditorialRow) {
    setBusy(true);
    setError(null);
    try {
      await fetchJson(`/api/studio/editorial/${resource}/${encodeURIComponent(item.saveId)}`, {
        method: "PATCH",
        body: buildSaveBody(resource, item.data, fields),
        fallback: "Could not save that.",
      });
      setDirty(false);
      await refresh();
    } catch (caught) {
      setError(errorMessage(caught, "Could not save that."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: EditorialRow) {
    setBusy(true);
    setError(null);
    try {
      await fetch(`/api/studio/editorial/${resource}/${encodeURIComponent(item.saveId)}`, { method: "DELETE" });
      setDirty(false);
      await refresh();
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
    try {
      await fetchJson(`/api/studio/editorial/${resource}`, { method: "POST", body: createBody, fallback: "Could not create that." });
      setDirty(false);
      await refresh();
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
      {items.length === 0 && <StudioEmpty title="Nothing here yet" />}
      <ul className="space-y-4">
        {items.map((item) => {
          const row = item.data;
          const heading = String(row.title || row.name || row.city_label || "Untitled");
          return (
            <li key={item.saveId} className="overflow-hidden rounded-surface border border-line bg-surface">
              <div className="border-b border-line bg-navy-tint/60 px-5 py-3">
                <h2 className="text-h3 text-ink">{heading}</h2>
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
                <Button type="button" variant="secondary" disabled={busy || uploadingId === item.saveId} onClick={() => void save(item)}>Save</Button>
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

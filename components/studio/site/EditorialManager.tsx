"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { StudioAlert, StudioEmpty, StudioPage } from "@/components/studio/chrome";
import { EditorialFields } from "@/components/studio/site/EditorialFields";
import {
  buildSaveBody,
  editorialHeading,
  FIELD_LABELS,
  type EditorialResource,
} from "@/components/studio/site/editorialConfig";
import { Button, LinkButton } from "@/components/ui/Button";
import { EditorialListSkeleton } from "@/components/studio/StudioSkeletons";
import { useUserKeys } from "@/components/providers/AuthProvider";
import { fetchJson, HttpError } from "@/lib/queries/fetcher";
import { useEditorialList, type EditorialBody } from "@/lib/queries/siteStudio";

type EditorialRow = {
  /** Stable id used in PATCH/DELETE URLs — never changes while editing. */
  saveId: string;
  data: Record<string, unknown>;
};

function toRows(list: Array<Record<string, unknown>>, idKey: string): EditorialRow[] {
  return list.map((data) => ({ saveId: String(data[idKey] ?? ""), data: { ...data } }));
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

function summaryLine(resource: string, row: Record<string, unknown>) {
  if (resource === "partners") {
    const bits = [row.category, row.is_active === false ? "Hidden" : null].filter(Boolean);
    return bits.map(String).join(" · ") || "Partner";
  }
  if (resource === "news") {
    const bits = [row.source, row.is_hidden ? "Hidden" : null].filter(Boolean);
    return bits.map(String).join(" · ") || "Headline";
  }
  const bits = [row.label, row.amount_text, row.is_active === false ? "Hidden" : null].filter(Boolean);
  return bits.map(String).join(" · ") || "Program";
}

export function EditorialManager({
  resource,
  title,
  lede,
  rows,
  idKey,
  fields,
  createHref,
  justCreated = false,
}: {
  resource: EditorialResource | string;
  title: string;
  lede: string;
  rows: Array<Record<string, unknown>>;
  idKey: string;
  fields: string[];
  createHref?: string;
  /** True when redirected here after a successful create. */
  justCreated?: boolean;
}) {
  const keys = useUserKeys();
  const queryClient = useQueryClient();
  const list = useEditorialList(resource, rows);
  const serverRows = list.data?.results ?? rows;
  const [items, setItems] = useState(() => toRows(rows, idKey));
  const [seenAt, setSeenAt] = useState(list.dataUpdatedAt);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(() =>
    justCreated ? "Created. Open the new row below if you want to refine it." : null,
  );
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

  const createAction = useMemo(() => {
    if (!createHref) return null;
    return (
      <LinkButton href={createHref} variant="primary" size="sm">
        Add new
      </LinkButton>
    );
  }, [createHref]);

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
        body: buildSaveBody(item.data, fields),
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
      if (openId === item.saveId) setOpenId(null);
      setNotice("Removed from the public page.");
    } catch (caught) {
      setError(errorMessage(caught, "Could not delete that."));
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
    <StudioPage kicker="Editorial" title={title} description={lede} actions={createAction}>
      {error && <StudioAlert>{error}</StudioAlert>}
      {notice && (
        <p role="status" className="rounded-control border border-positive/40 bg-surface px-4 py-2.5 text-small text-ink">
          {notice}
        </p>
      )}
      {items.length === 0 ? (
        <StudioEmpty
          title="Nothing here yet"
          action={
            createHref ? (
              <LinkButton href={createHref} size="sm">
                Add new
              </LinkButton>
            ) : undefined
          }
        >
          Create the first item on its own page, then come back here to edit anytime.
        </StudioEmpty>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const row = item.data;
            const heading = editorialHeading(row);
            const dirty = dirtyIds.has(item.saveId);
            const open = openId === item.saveId;
            return (
              <li key={item.saveId || heading} className="overflow-hidden rounded-surface border border-line bg-surface shadow-card">
                <div className="flex flex-wrap items-center gap-3 border-b border-line bg-navy-tint/40 px-4 py-3 sm:px-5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : item.saveId)}
                  >
                    <span className="block truncate text-h3 text-ink">{heading}</span>
                    <span className="mt-0.5 block truncate text-caption text-ink-muted">
                      {summaryLine(resource, row)}
                      {dirty ? " · Unsaved changes" : ""}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant={open ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setOpenId(open ? null : item.saveId)}
                    >
                      {open ? "Close" : "Edit"}
                    </Button>
                  </div>
                </div>
                {open ? (
                  <div className="space-y-4 p-5">
                    <EditorialFields
                      resource={resource}
                      fields={fields}
                      values={row}
                      disabled={busy}
                      uploading={uploadingId === item.saveId}
                      onChange={(field, value) => patchItem(item.saveId, field, value)}
                      onUpload={(field, file) => void uploadImage(item, field, file)}
                    />
                    <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || uploadingId === item.saveId}
                        onClick={() => void save(item)}
                      >
                        Save
                      </Button>
                      {resource !== "news" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`Remove “${heading}”? It will leave the public page.`)) {
                              void remove(item);
                            }
                          }}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {createHref && items.length > 0 ? (
        <p className="text-center text-caption text-ink-muted">
          Need another one?{" "}
          <Link href={createHref} className="font-medium text-navy hover:underline">
            Add new on a separate page
          </Link>
        </p>
      ) : null}
    </StudioPage>
  );
}

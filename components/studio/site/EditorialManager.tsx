"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { EditorialListSkeleton } from "@/components/studio/StudioSkeletons";
import { useUserKeys } from "@/components/providers/AuthProvider";
import { fetchJson } from "@/lib/queries/fetcher";
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
  logo_url: "Logo image link",
  city_key: "City key",
  city_label: "City name",
  image_url: "Photo link",
  credit: "Photo credit",
  source: "Source",
  is_hidden: "Hide from the homepage",
};

const FIELD_HINTS: Record<string, string> = {
  city_key: "Lowercase city name, such as mississauga. The tile uses this to find the photo.",
  display_order: "1 shows first.",
  reviewed_at: "Use a date like 2026-10-10, or leave it blank.",
  is_active: "Turn this off to keep the row here without showing it to visitors.",
  is_hidden: "Hidden headlines leave the homepage. The feed can still bring them back in.",
};

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
  const [items, setItems] = useState(rows);
  const [seenAt, setSeenAt] = useState(list.dataUpdatedAt);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (list.dataUpdatedAt !== seenAt) {
    setSeenAt(list.dataUpdatedAt);
    setItems(serverRows);
  }

  async function refresh() {
    if (keys) await queryClient.invalidateQueries({ queryKey: keys.editorial(resource) });
  }

  async function save(row: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const body = resource === "news"
      ? { is_hidden: Boolean(row.is_hidden) }
      : {
          ...row,
          ...( "display_order" in row ? { display_order: Number(row.display_order) || 0 } : {}),
          ...( "reviewed_at" in row ? { reviewed_at: row.reviewed_at ? String(row.reviewed_at).slice(0, 10) : null } : {}),
        };
    try {
      await fetchJson(`/api/studio/editorial/${resource}/${encodeURIComponent(String(row[idKey]))}`, {
        method: "PATCH",
        body,
        fallback: "Could not save that.",
      });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fetch(`/api/studio/editorial/${resource}/${encodeURIComponent(String(row[idKey]))}`, { method: "DELETE" });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete that.");
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
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create that.");
    } finally {
      setBusy(false);
    }
  }

  if (list.isPending && !list.data) return <EditorialListSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-surface border border-line bg-surface p-5 sm:p-6">
        <div className="max-w-2xl">
          <h1 className="text-h1 text-ink">{title}</h1>
          <p className="mt-2 text-body text-ink-muted">{lede}</p>
        </div>
        {createBody && (
          <Button type="button" variant="primary" disabled={busy} onClick={() => void create()}>Add new</Button>
        )}
      </div>
      {error && <p role="alert" className="rounded-surface border border-negative/30 bg-surface px-4 py-3 text-body text-negative">{error}</p>}
      {items.length === 0 && (
        <p className="rounded-surface border border-line bg-surface p-8 text-body text-ink-muted">Nothing here yet.</p>
      )}
      <ul className="space-y-4">
        {items.map((row) => {
          const heading = String(row.title || row.name || row.city_label || "Untitled");
          return (
            <li key={String(row[idKey])} className="space-y-4 rounded-surface border border-line bg-surface p-5">
              <h2 className="text-h3 text-ink">{heading}</h2>
              {resource === "news" && row.source ? <p className="-mt-2 text-small text-ink-muted">{String(row.source)}</p> : null}
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
                          onCheckedChange={(checked) => setItems(items.map((item) => item[idKey] === row[idKey] ? { ...item, [field]: checked } : item))}
                        />
                      </label>
                    );
                  }
                  const wide = field === "description" || field === "source_url" || field === "website_url" || field === "image_url" || field === "logo_url";
                  return (
                    <label key={field} className={`block text-small font-medium text-ink ${wide ? "sm:col-span-2" : ""}`}>
                      {label}
                      <Input
                        className="mt-1.5 font-normal"
                        value={row[field] == null ? "" : String(row[field])}
                        onChange={(event) => setItems(items.map((item) => item[idKey] === row[idKey] ? { ...item, [field]: event.target.value } : item))}
                      />
                      {FIELD_HINTS[field] && <span className="mt-1 block font-normal text-caption text-ink-muted">{FIELD_HINTS[field]}</span>}
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2 border-t border-line pt-4">
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void save(row)}>Save</Button>
                {resource !== "news" && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Remove “${heading}”? It will leave the public page.`)) void remove(row);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

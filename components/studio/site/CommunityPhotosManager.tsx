"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { StudioAlert, StudioPage } from "@/components/studio/chrome";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useUserKeys } from "@/components/providers/AuthProvider";
import { COMMUNITY_CITIES } from "@/lib/constants/cities";
import { communities as sampleCommunities } from "@/lib/home/sampleData";
import { fetchJson, HttpError } from "@/lib/queries/fetcher";
import { useEditorialList, type EditorialBody } from "@/lib/queries/siteStudio";

type PhotoRow = {
  cityKey: string;
  cityLabel: string;
  imageUrl: string;
  /** Sample/default preview when no curated http(s) URL is saved yet. */
  fallbackUrl: string;
  credit: string;
  /** True when this city already has a CommunityImage row in the API. */
  exists: boolean;
  dirty: boolean;
};

const SAMPLE_BY_KEY = new Map(
  sampleCommunities.map((c) => [c.name.toLowerCase(), c.image] as const),
);

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function mergeRows(apiRows: Array<Record<string, unknown>>): PhotoRow[] {
  const byKey = new Map<string, Record<string, unknown>>();
  for (const row of apiRows) {
    const key = String(row.city_key ?? "")
      .trim()
      .toLowerCase();
    if (key) byKey.set(key, row);
  }

  const known = new Set(COMMUNITY_CITIES.map((city) => city.toLowerCase()));
  const rows: PhotoRow[] = COMMUNITY_CITIES.map((city) => {
    const cityKey = city.toLowerCase();
    const existing = byKey.get(cityKey);
    const sample = SAMPLE_BY_KEY.get(cityKey) || "";
    const saved = existing ? String(existing.image_url || "") : "";
    return {
      cityKey,
      cityLabel: existing ? String(existing.city_label || city) : city,
      // Only put http(s) URLs in the editable field — local sample paths are preview-only.
      imageUrl: saved || (isHttpUrl(sample) ? sample : ""),
      fallbackUrl: sample,
      credit: existing ? String(existing.credit || "") : "",
      exists: Boolean(existing),
      dirty: false,
    };
  });

  // Keep any custom cities an admin added that aren't in the standard list.
  for (const [cityKey, existing] of byKey) {
    if (known.has(cityKey)) continue;
    rows.push({
      cityKey,
      cityLabel: String(existing.city_label || cityKey),
      imageUrl: String(existing.image_url || ""),
      fallbackUrl: "",
      credit: String(existing.credit || ""),
      exists: true,
      dirty: false,
    });
  }

  return rows;
}

function errorMessage(caught: unknown, fallback: string): string {
  if (caught instanceof HttpError) {
    const fields = Object.entries(caught.fieldErrors);
    if (fields.length > 0) {
      return fields.map(([key, message]) => `${key}: ${message}`).join(" ");
    }
    return caught.message || fallback;
  }
  return caught instanceof Error ? caught.message : fallback;
}

export function CommunityPhotosManager({
  rows: initialRows,
}: {
  rows: Array<Record<string, unknown>>;
}) {
  const keys = useUserKeys();
  const queryClient = useQueryClient();
  const list = useEditorialList("community-images", initialRows);
  const serverRows = list.data?.results ?? initialRows;
  const [items, setItems] = useState(() => mergeRows(initialRows));
  const [seenAt, setSeenAt] = useState(list.dataUpdatedAt);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  if (list.dataUpdatedAt !== seenAt) {
    setSeenAt(list.dataUpdatedAt);
    setItems((current) => {
      const dirty = new Map(current.filter((row) => row.dirty).map((row) => [row.cityKey, row]));
      return mergeRows(serverRows).map((row) => dirty.get(row.cityKey) ?? row);
    });
  }

  function patch(cityKey: string, patch: Partial<Pick<PhotoRow, "imageUrl" | "credit" | "cityLabel">>) {
    setNotice(null);
    setItems((current) =>
      current.map((row) => (row.cityKey === cityKey ? { ...row, ...patch, dirty: true } : row)),
    );
  }

  async function loadLatest(): Promise<PhotoRow[]> {
    const fetchList = () =>
      fetchJson<EditorialBody>("/api/studio/editorial/community-images", {
        cache: "no-store",
        fallback: "Could not load community photos.",
      });
    const data = keys
      ? await queryClient.fetchQuery({
          queryKey: keys.editorial("community-images"),
          queryFn: ({ signal }) =>
            fetchJson<EditorialBody>("/api/studio/editorial/community-images", {
              signal,
              cache: "no-store",
              fallback: "Could not load community photos.",
            }),
        })
      : await fetchList();
    return mergeRows(data.results ?? []);
  }

  async function save(row: PhotoRow) {
    const imageUrl = row.imageUrl.trim();
    if (!isHttpUrl(imageUrl)) {
      setError(`Paste an https image link or upload a photo for ${row.cityLabel} before saving.`);
      return;
    }
    setBusyKey(row.cityKey);
    setError(null);
    setNotice(null);
    const body = {
      city_key: row.cityKey,
      city_label: row.cityLabel,
      image_url: imageUrl,
      credit: row.credit.trim(),
    };
    try {
      // Upsert: PATCH creates the row when this city only had a frontend fallback.
      await fetchJson(`/api/studio/editorial/community-images/${encodeURIComponent(row.cityKey)}`, {
        method: "PATCH",
        body,
        fallback: "Could not save that photo.",
      });
      const latest = await loadLatest();
      setItems(latest);
      setNotice(`Saved photo for ${row.cityLabel}.`);
    } catch (caught) {
      setError(errorMessage(caught, "Could not save that photo."));
    } finally {
      setBusyKey(null);
    }
  }

  async function remove(row: PhotoRow) {
    if (!row.exists) {
      setItems((current) =>
        current.map((item) =>
          item.cityKey === row.cityKey
            ? { ...item, imageUrl: isHttpUrl(item.fallbackUrl) ? item.fallbackUrl : "", credit: "", dirty: false }
            : item,
        ),
      );
      return;
    }
    if (!window.confirm(`Remove the curated photo for “${row.cityLabel}”? The site will fall back to the default image.`)) {
      return;
    }
    setBusyKey(row.cityKey);
    setError(null);
    setNotice(null);
    try {
      await fetch(`/api/studio/editorial/community-images/${encodeURIComponent(row.cityKey)}`, {
        method: "DELETE",
      });
      const latest = await loadLatest();
      setItems(latest);
      setNotice(`Removed curated photo for ${row.cityLabel}.`);
    } catch (caught) {
      setError(errorMessage(caught, "Could not remove that photo."));
    } finally {
      setBusyKey(null);
    }
  }

  async function upload(row: PhotoRow, file: File) {
    setUploadingKey(row.cityKey);
    setError(null);
    if (file.size > 8 * 1024 * 1024) {
      setError("Images must be 8 MB or smaller.");
      setUploadingKey(null);
      return;
    }
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) {
      setError("Upload a JPEG, PNG, or WebP image.");
      setUploadingKey(null);
      return;
    }
    if (bitmap.width < 800 || bitmap.height < 450) {
      setError("Use an image at least 800×450 pixels so it stays sharp on the site.");
      bitmap.close();
      setUploadingKey(null);
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
      patch(row.cityKey, { imageUrl: data.url });
    } catch (caught) {
      setError(errorMessage(caught, "Could not upload that image."));
    } finally {
      setUploadingKey(null);
    }
  }

  return (
    <StudioPage
      title="Community photos"
      description="Photos for community tiles on the homepage and /communities."
    >
      {error && <StudioAlert>{error}</StudioAlert>}
      {notice && (
        <p role="status" className="rounded-control border border-positive/40 bg-surface px-3.5 py-2.5 text-small text-ink">
          {notice}
        </p>
      )}
      <div className="overflow-x-auto border border-line bg-surface">
        <table className="w-full min-w-[48rem] border-collapse text-left text-small">
          <thead>
            <tr>
              <th scope="col" className="border-b border-line px-3.5 py-2.5 text-caption font-medium text-ink-muted">
                Community
              </th>
              <th scope="col" className="border-b border-line px-3.5 py-2.5 text-caption font-medium text-ink-muted">
                Photo
              </th>
              <th scope="col" className="border-b border-line px-3.5 py-2.5 text-caption font-medium text-ink-muted">
                Details
              </th>
              <th scope="col" className="border-b border-line px-3.5 py-2.5 text-caption font-medium text-ink-muted">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const busy = busyKey === row.cityKey;
              const uploading = uploadingKey === row.cityKey;
              return (
                <tr key={row.cityKey}>
                  <td className="border-b border-line/70 px-3.5 py-3 align-top">
                    <span className="studio-cell-title">{row.cityLabel}</span>
                    <span className="studio-cell-meta">
                      {row.cityKey}
                      {" · "}
                      {row.dirty ? "Unsaved" : row.exists ? "Saved" : "Default"}
                    </span>
                  </td>
                  <td className="border-b border-line/70 px-3.5 py-3 align-top">
                    <div className="h-16 w-24 overflow-hidden rounded-md bg-surface-alt">
                      {row.imageUrl || row.fallbackUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary CMS / sample URLs
                        <img
                          src={row.imageUrl || row.fallbackUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-caption text-ink-muted">—</div>
                      )}
                    </div>
                  </td>
                  <td className="border-b border-line/70 px-3.5 py-3 align-top">
                    <div className="space-y-2">
                      <Input
                        className="h-9 font-normal"
                        value={row.imageUrl}
                        placeholder="Photo URL"
                        aria-label={`Photo link for ${row.cityLabel}`}
                        onChange={(event) => patch(row.cityKey, { imageUrl: event.target.value })}
                      />
                      <Input
                        className="h-9 font-normal"
                        value={row.credit}
                        placeholder="Photo credit"
                        aria-label={`Photo credit for ${row.cityLabel}`}
                        onChange={(event) => patch(row.cityKey, { credit: event.target.value })}
                      />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="block text-caption text-ink-muted"
                        disabled={busy || uploading}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) void upload(row, file);
                        }}
                      />
                      {uploading ? <p className="text-caption text-ink-muted">Uploading…</p> : null}
                    </div>
                  </td>
                  <td className="border-b border-line/70 px-3.5 py-3 align-top">
                    <div className="flex flex-col items-end gap-2">
                      <Button type="button" variant="secondary" size="sm" disabled={busy || uploading} onClick={() => void save(row)}>
                        Save
                      </Button>
                      <Button type="button" variant="ghost" size="sm" disabled={busy || uploading} onClick={() => void remove(row)}>
                        {row.exists ? "Remove" : "Reset"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </StudioPage>
  );
}

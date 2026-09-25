"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { RichTextEditor } from "@/components/studio/RichTextEditor";
import { PreconStatusPill } from "@/components/studio/StudioPills";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import {
  isNamedMetaKey,
  PRECON_DOCUMENT_FIELDS,
  PRECON_META_FIELDS,
  PRECON_NAMED_META_KEYS,
  PRECON_STATUSES,
  SALES_STAGES,
  type PreconStatus,
  type StudioPrecon,
  type StudioPreconAttachment,
  type StudioPreconInput,
} from "@/lib/api/studioAdmin";
import type { PreconSalesStage } from "@/lib/api/preconstruction";
import { HttpError } from "@/lib/queries/fetcher";
import { useDeletePrecon, useSavePrecon, useUploadPreconAsset } from "@/lib/queries/studioAdmin";
import { preconPath } from "@/lib/seo/urls";

const NUMBER_FIELDS = [
  { key: "price", label: "Starting price ($)", step: "1000" },
  { key: "bedrooms", label: "Bedrooms", step: "1" },
  { key: "bathrooms", label: "Bathrooms", step: "0.5" },
  { key: "garages", label: "Garages", step: "1" },
  { key: "area", label: "Interior area (sq ft)", step: "1" },
  { key: "lot_size", label: "Lot size", step: "0.01" },
] as const;

type NumberKey = (typeof NUMBER_FIELDS)[number]["key"] | "latitude" | "longitude" | "featured_order";

interface FormState {
  title: string;
  slug: string;
  status: PreconStatus;
  body: string;
  excerpt: string;
  address: string;
  developer: string;
  salesStage: PreconSalesStage | "";
  isFeatured: boolean;
  numbers: Record<NumberKey, string>;
  meta: Record<string, string>;
  /** Unnamed meta keys, editable as rows. */
  extra: Array<{ key: string; value: string }>;
  attachments: StudioPreconAttachment[];
}

const numText = (value: number | null) => (value === null ? "" : String(value));

function initialState(project: StudioPrecon | null): FormState {
  const meta = project?.meta ?? {};
  return {
    title: project?.title ?? "",
    slug: project?.slug ?? "",
    status: (PRECON_STATUSES.find((s) => s.value === project?.status)?.value ?? "draft") as PreconStatus,
    body: project?.body ?? "",
    excerpt: project?.excerpt ?? "",
    address: project?.address ?? "",
    developer: project?.developer ?? "",
    salesStage: project?.salesStage ?? "",
    isFeatured: project?.isFeatured ?? false,
    numbers: {
      price: numText(project?.price ?? null),
      bedrooms: numText(project?.bedrooms ?? null),
      bathrooms: numText(project?.bathrooms ?? null),
      garages: numText(project?.garages ?? null),
      area: numText(project?.area ?? null),
      lot_size: numText(project?.lotSize ?? null),
      latitude: numText(project?.latitude ?? null),
      longitude: numText(project?.longitude ?? null),
      featured_order: numText(project?.featuredOrder ?? null),
    },
    meta: Object.fromEntries(Object.entries(meta).filter(([key]) => isNamedMetaKey(key))),
    extra: Object.entries(meta)
      .filter(([key]) => !isNamedMetaKey(key))
      .map(([key, value]) => ({ key, value })),
    attachments: project?.attachments ?? [],
  };
}

const parseNumber = (value: string): number | null => {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};

/**
 * Builds the PATCH/POST body. Meta is sent as a diff against what was
 * loaded: removed keys go as null so the backend deletes them, untouched
 * keys it doesn't know about are left alone.
 */
export function buildPreconPayload(form: FormState, original: Record<string, string>): StudioPreconInput {
  const meta: Record<string, string | null> = {};
  for (const key of PRECON_NAMED_META_KEYS) {
    const value = (form.meta[key] ?? "").trim();
    if (value !== (original[key] ?? "")) meta[key] = value || null;
  }
  const kept = new Set<string>();
  for (const row of form.extra) {
    const key = row.key.trim();
    if (!key) continue;
    kept.add(key);
    if (row.value !== (original[key] ?? "")) meta[key] = row.value.trim() || null;
  }
  for (const key of Object.keys(original)) {
    if (!isNamedMetaKey(key) && !kept.has(key)) meta[key] = null;
  }

  const n = form.numbers;
  return {
    title: form.title.trim(),
    slug: form.slug.trim(),
    status: form.status,
    body: form.body,
    excerpt: form.excerpt.trim(),
    address: form.address.trim(),
    developer_name: form.developer.trim(),
    sales_stage: form.salesStage,
    is_featured: form.isFeatured,
    featured_order: form.isFeatured ? parseNumber(n.featured_order) : null,
    price: parseNumber(n.price),
    bedrooms: parseNumber(n.bedrooms),
    bathrooms: parseNumber(n.bathrooms),
    garages: parseNumber(n.garages),
    area: parseNumber(n.area),
    lot_size: parseNumber(n.lot_size),
    latitude: parseNumber(n.latitude),
    longitude: parseNumber(n.longitude),
    attachments: form.attachments.map((a) => ({ url: a.url, title: a.title, mime_type: a.mimeType })),
    meta,
  };
}

/** DRF field errors arrive as {field: ["msg"]} inside the proxy's `fields`. */
function fieldErrorsOf(error: unknown): Record<string, string> {
  if (!(error instanceof HttpError)) return {};
  const fields = (error.payload as { fields?: unknown } | null)?.fields;
  if (!fields || typeof fields !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
    const message = Array.isArray(value) ? value.find((v) => typeof v === "string") : value;
    if (typeof message === "string") out[key] = message;
    else if (value && typeof value === "object") out[key] = "Check this field.";
  }
  return out;
}

const isImage = (a: StudioPreconAttachment) =>
  a.mimeType.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(a.url);

export function PreconEditor({ project }: { project: StudioPrecon | null }) {
  const router = useRouter();
  const id = useId();
  const save = useSavePrecon();
  const remove = useDeletePrecon();
  const upload = useUploadPreconAsset();
  const [form, setForm] = useState<FormState>(() => initialState(project));
  const [saved, setSaved] = useState<StudioPrecon | null>(project);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const original = useMemo(() => saved?.meta ?? {}, [saved]);
  const errors = fieldErrorsOf(save.error);
  const dirty = useMemo(
    () => JSON.stringify(buildPreconPayload(form, original)) !== JSON.stringify(buildPreconPayload(initialState(saved), original)),
    [form, original, saved],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setNumber = (key: NumberKey, value: string) => setForm((f) => ({ ...f, numbers: { ...f.numbers, [key]: value } }));
  const setMeta = (key: string, value: string) => setForm((f) => ({ ...f, meta: { ...f.meta, [key]: value } }));

  async function submit(statusOverride?: PreconStatus) {
    setNotice(null);
    const next = statusOverride ? { ...form, status: statusOverride } : form;
    if (!next.title.trim()) return;
    try {
      const result = await save.mutateAsync({ id: saved?.id ?? null, payload: buildPreconPayload(next, original) });
      setSaved(result);
      setForm(initialState(result));
      setNotice(result.status === "publish" ? "Saved. The public page updates within a few seconds." : "Saved.");
      if (!saved) router.replace(`/studio/precon/${result.id}`);
    } catch {
      // Rendered from save.error.
    }
  }

  async function uploadFiles(files: FileList | null, onDone: (asset: StudioPreconAttachment) => void) {
    setUploadError(null);
    for (const file of Array.from(files ?? [])) {
      try {
        const asset = await upload.mutateAsync(file);
        onDone({ url: asset.url, title: asset.title || file.name, mimeType: asset.mimeType });
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Could not upload that file.");
        return;
      }
    }
  }

  function moveAttachment(index: number, delta: number) {
    setForm((f) => {
      const list = [...f.attachments];
      const target = index + delta;
      if (target < 0 || target >= list.length) return f;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...f, attachments: list };
    });
  }

  async function confirmRemove() {
    if (!saved) return;
    setDeleteError(null);
    try {
      await remove.mutateAsync(saved.id);
      router.push("/studio/precon");
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete the project.");
    }
  }

  const fid = (name: string) => `${id}-${name}`;
  const isLive = saved?.status === "publish";

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/studio/precon" className="text-caption text-ink-muted hover:text-navy">
            ← All projects
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="truncate text-h1 text-ink">{saved ? saved.title : "New project"}</h1>
            {saved && <PreconStatusPill status={saved.status} />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLive && saved && (
            <Link
              href={preconPath(saved.id, saved.slug || saved.title)}
              target="_blank"
              className="text-caption font-medium text-ink-muted hover:text-navy"
            >
              View on site ↗
            </Link>
          )}
          {saved && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
          <Button type="submit" variant="secondary" size="sm" loading={save.isPending} disabled={!form.title.trim()}>
            Save
          </Button>
          {form.status !== "publish" && (
            <Button size="sm" onClick={() => void submit("publish")} disabled={save.isPending || !form.title.trim()}>
              Save and publish
            </Button>
          )}
        </div>
      </div>

      <div aria-live="polite">
        {save.error && (
          <p role="alert" className="rounded-control border border-negative/30 bg-negative-soft/40 px-3 py-2 text-small text-ink">
            {Object.keys(errors).length ? "Fix the highlighted fields and save again." : save.error.message}
          </p>
        )}
        {notice && !dirty && <p className="rounded-control bg-positive-soft px-3 py-2 text-small text-positive">{notice}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <Panel title="Basics">
            <Field label="Project name" htmlFor={fid("title")} required error={errors.title}>
              <Input id={fid("title")} value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={500} required />
            </Field>
            <Field label="URL slug" htmlFor={fid("slug")} hint="Leave blank to generate it from the name." error={errors.slug}>
              <Input id={fid("slug")} value={form.slug} onChange={(e) => set("slug", e.target.value)} maxLength={500} />
            </Field>
            <Field label="Short summary" htmlFor={fid("excerpt")} hint="Shown when the page has no description." error={errors.excerpt}>
              <Textarea id={fid("excerpt")} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} className="min-h-20" />
            </Field>
            <div className="space-y-1.5">
              <p className="text-small font-medium text-ink">Description</p>
              <RichTextEditor value={form.body} onChange={(html) => set("body", html)} onUploadError={setUploadError} />
            </div>
          </Panel>

          <Panel title="Location">
            <Field label="Address" htmlFor={fid("address")} error={errors.address}>
              <Input id={fid("address")} value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" htmlFor={fid("lat")} hint="Places the project on the map." error={errors.latitude}>
                <Input id={fid("lat")} inputMode="decimal" value={form.numbers.latitude} onChange={(e) => setNumber("latitude", e.target.value)} />
              </Field>
              <Field label="Longitude" htmlFor={fid("lng")} error={errors.longitude}>
                <Input id={fid("lng")} inputMode="decimal" value={form.numbers.longitude} onChange={(e) => setNumber("longitude", e.target.value)} />
              </Field>
            </div>
            <Field label="Location shown to visitors" htmlFor={fid("location_display")} hint="Optional, e.g. Vaughan Metropolitan Centre">
              <Input id={fid("location_display")} value={form.meta.location_display ?? ""} onChange={(e) => setMeta("location_display", e.target.value)} />
            </Field>
          </Panel>

          <Panel title="Homes and pricing">
            <div className="grid gap-4 sm:grid-cols-3">
              {NUMBER_FIELDS.map((field) => (
                <Field key={field.key} label={field.label} htmlFor={fid(field.key)} error={errors[field.key]}>
                  <Input
                    id={fid(field.key)}
                    inputMode="decimal"
                    value={form.numbers[field.key]}
                    onChange={(e) => setNumber(field.key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
            {PRECON_META_FIELDS.map((field) => (
              <Field key={field.key} label={field.label} htmlFor={fid(field.key)} hint={field.hint}>
                {"multiline" in field && field.multiline ? (
                  <Textarea id={fid(field.key)} value={form.meta[field.key] ?? ""} onChange={(e) => setMeta(field.key, e.target.value)} className="min-h-20" />
                ) : (
                  <Input id={fid(field.key)} value={form.meta[field.key] ?? ""} onChange={(e) => setMeta(field.key, e.target.value)} />
                )}
              </Field>
            ))}
          </Panel>

          <Panel
            title="Photos and files"
            description="The first photo is the cover image on cards and the project page. Use the arrows to reorder."
          >
            {form.attachments.length === 0 ? (
              <p className="text-small text-ink-muted">No photos yet.</p>
            ) : (
              <ul className="space-y-2">
                {form.attachments.map((attachment, index) => (
                  <li key={`${attachment.url}-${index}`} className="flex items-center gap-3 rounded-control border border-line p-2">
                    {isImage(attachment) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={attachment.url} alt="" className="h-12 w-16 shrink-0 rounded-control object-cover" />
                    ) : (
                      <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-control bg-surface-alt text-caption font-semibold text-ink-muted">
                        FILE
                      </span>
                    )}
                    <Input
                      aria-label={`Caption for file ${index + 1}`}
                      value={attachment.title}
                      placeholder="Caption"
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          attachments: f.attachments.map((a, i) => (i === index ? { ...a, title: e.target.value } : a)),
                        }))
                      }
                      className="h-9"
                    />
                    {index === 0 && isImage(attachment) && <span className="shrink-0 text-caption text-ink-muted">Cover</span>}
                    <div className="flex shrink-0 gap-1">
                      <IconAction label="Move up" onClick={() => moveAttachment(index, -1)} disabled={index === 0}>
                        ↑
                      </IconAction>
                      <IconAction label="Move down" onClick={() => moveAttachment(index, 1)} disabled={index === form.attachments.length - 1}>
                        ↓
                      </IconAction>
                      <IconAction
                        label="Remove"
                        onClick={() => set("attachments", form.attachments.filter((_, i) => i !== index))}
                      >
                        ×
                      </IconAction>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={photoInput}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                aria-label="Upload photos"
                onChange={(e) => {
                  void uploadFiles(e.target.files, (asset) => setForm((f) => ({ ...f, attachments: [...f.attachments, asset] })));
                  e.target.value = "";
                }}
              />
              <Button size="sm" variant="secondary" onClick={() => photoInput.current?.click()} loading={upload.isPending}>
                Upload photos
              </Button>
              {errors.attachments && <p className="text-caption text-negative">{errors.attachments}</p>}
            </div>
          </Panel>

          <Panel
            title="Gated documents"
            description="Released only to signed-in visitors with a verified phone. Paste a link or upload a PDF."
          >
            {PRECON_DOCUMENT_FIELDS.map((field) => (
              <DocumentField
                key={field.key}
                id={fid(field.key)}
                label={field.label}
                value={form.meta[field.key] ?? ""}
                onChange={(value) => setMeta(field.key, value)}
                onUpload={(files) => void uploadFiles(files, (asset) => setMeta(field.key, asset.url))}
                uploading={upload.isPending}
              />
            ))}
          </Panel>

          <Panel
            title="Other details"
            description="Extra fields from imports (deposit plans, floor plan collections, etc.). Keys use lowercase and underscores."
          >
            {form.extra.map((row, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[14rem_minmax(0,1fr)_auto]">
                <Input
                  aria-label={`Detail ${index + 1} key`}
                  value={row.key}
                  placeholder="key_name"
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      extra: f.extra.map((r, i) => (i === index ? { ...r, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") } : r)),
                    }))
                  }
                  className="h-9 font-mono text-caption"
                />
                <Textarea
                  aria-label={`Detail ${index + 1} value`}
                  value={row.value}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, extra: f.extra.map((r, i) => (i === index ? { ...r, value: e.target.value } : r)) }))
                  }
                  className="min-h-9 py-2 font-mono text-caption"
                  rows={row.value.length > 80 ? 4 : 1}
                />
                <IconAction label="Remove detail" onClick={() => set("extra", form.extra.filter((_, i) => i !== index))}>
                  ×
                </IconAction>
              </div>
            ))}
            {errors.meta && <p className="text-caption text-negative">{errors.meta}</p>}
            <Button size="sm" variant="ghost" onClick={() => set("extra", [...form.extra, { key: "", value: "" }])}>
              + Add detail
            </Button>
          </Panel>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-0 lg:h-fit">
          <Panel title="Publishing">
            <Field label="Status" htmlFor={fid("status")} hint="Only Published projects appear on the site." error={errors.status}>
              <Select id={fid("status")} value={form.status} onChange={(e) => set("status", e.target.value as PreconStatus)}>
                {PRECON_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sales stage" htmlFor={fid("stage")} error={errors.sales_stage}>
              <Select id={fid("stage")} value={form.salesStage} onChange={(e) => set("salesStage", e.target.value as PreconSalesStage | "")}>
                <option value="">Not set</option>
                {SALES_STAGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Developer" htmlFor={fid("developer")} error={errors.developer_name}>
              <Input id={fid("developer")} value={form.developer} onChange={(e) => set("developer", e.target.value)} maxLength={255} />
            </Field>
          </Panel>

          <Panel title="Homepage">
            <div className="flex items-center justify-between gap-3">
              <span id={fid("featured-label")} className="text-small text-ink">
                Feature on the homepage
              </span>
              <Switch aria-labelledby={fid("featured-label")} checked={form.isFeatured} onCheckedChange={(v) => set("isFeatured", v)} />
            </div>
            {form.isFeatured && (
              <Field label="Position" htmlFor={fid("order")} hint="1 shows first. Leave blank to sort by newest." error={errors.featured_order}>
                <Input id={fid("order")} inputMode="numeric" value={form.numbers.featured_order} onChange={(e) => setNumber("featured_order", e.target.value)} />
              </Field>
            )}
          </Panel>

          {saved && (
            <p className="text-caption text-ink-subtle">
              Project #{saved.id}
              {saved.wpId ? ` · import ID ${saved.wpId}` : ""}
              {saved.assignmentCount ? ` · ${saved.assignmentCount} linked assignment(s)` : ""}
            </p>
          )}
          {uploadError && (
            <p role="alert" className="text-caption text-negative">
              {uploadError}
            </p>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => {
          setConfirmDelete(false);
          setDeleteError(null);
        }}
        onConfirm={() => void confirmRemove()}
        title="Delete this project?"
        confirmLabel="Delete project"
        tone="danger"
        busy={remove.isPending}
        error={deleteError}
      >
        <p>
          <strong className="text-ink">{saved?.title}</strong> and its photos and details will be permanently deleted.
          {isLive && " It is live now, so its page will stop working."} To hide it but keep its history, set the status
          to Archived instead.
        </p>
      </ConfirmDialog>
    </form>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-surface border border-line bg-surface p-5">
      <div>
        <h2 className="text-h3 text-ink">{title}</h2>
        {description && <p className="mt-1 text-caption text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-control border border-line text-ink-muted transition-colors hover:border-navy hover:text-navy disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function DocumentField({
  id,
  label,
  value,
  onChange,
  onUpload,
  uploading,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onUpload: (files: FileList | null) => void;
  uploading: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex gap-2">
        <Input id={id} type="url" value={value} placeholder="https://…" onChange={(e) => onChange(e.target.value)} />
        <input
          ref={input}
          type="file"
          accept="application/pdf,image/*"
          className="sr-only"
          aria-label={`Upload ${label}`}
          onChange={(e) => {
            onUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <Button size="sm" variant="secondary" className="h-11" onClick={() => input.current?.click()} disabled={uploading}>
          Upload
        </Button>
        {value && (
          <a href={value} target="_blank" rel="noreferrer" className="self-center text-caption text-ink-muted hover:text-navy">
            Open
          </a>
        )}
      </div>
    </Field>
  );
}

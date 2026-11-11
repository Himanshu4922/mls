"use client";

import { Input } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import {
  FIELD_HINTS,
  FIELD_LABELS,
  IMAGE_FIELDS,
  INCENTIVE_ICONS,
  type EditorialResource,
} from "@/components/studio/site/editorialConfig";

export function EditorialFields({
  resource,
  fields,
  values,
  disabled,
  uploading,
  onChange,
  onUpload,
}: {
  resource: EditorialResource | string;
  fields: string[];
  values: Record<string, unknown>;
  disabled?: boolean;
  uploading?: boolean;
  onChange: (field: string, value: unknown) => void;
  onUpload?: (field: string, file: File) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const label = FIELD_LABELS[field] || field;
        if (typeof values[field] === "boolean" || field === "is_active" || field === "is_hidden") {
          return (
            <label
              key={field}
              className="flex items-center justify-between gap-4 rounded-control border border-line px-4 py-3 sm:col-span-2"
            >
              <span>
                <span className="block text-small font-medium text-ink">{label}</span>
                {FIELD_HINTS[field] ? (
                  <span className="mt-0.5 block text-caption text-ink-muted">{FIELD_HINTS[field]}</span>
                ) : null}
              </span>
              <Switch
                aria-label={label}
                checked={Boolean(values[field])}
                disabled={disabled}
                onCheckedChange={(checked) => onChange(field, checked)}
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
                value={values[field] == null ? "home" : String(values[field])}
                disabled={disabled}
                onChange={(event) => onChange(field, event.target.value)}
              >
                {INCENTIVE_ICONS.map((icon) => (
                  <option key={icon.value} value={icon.value}>
                    {icon.label}
                  </option>
                ))}
              </select>
              {FIELD_HINTS[field] ? (
                <span className="mt-1 block font-normal text-caption text-ink-muted">{FIELD_HINTS[field]}</span>
              ) : null}
            </label>
          );
        }
        if (IMAGE_FIELDS.has(field)) {
          const url = values[field] == null ? "" : String(values[field]);
          return (
            <div key={field} className="space-y-2 sm:col-span-2">
              <label className="block text-small font-medium text-ink">
                {label}
                <Input
                  className="mt-1.5 font-normal"
                  value={url}
                  placeholder="https://…"
                  disabled={disabled}
                  onChange={(event) => onChange(field, event.target.value)}
                />
              </label>
              {onUpload ? (
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="block text-caption text-ink-muted"
                  disabled={disabled || uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) onUpload(field, file);
                  }}
                />
              ) : null}
              {FIELD_HINTS[field] ? <p className="text-caption text-ink-muted">{FIELD_HINTS[field]}</p> : null}
              {uploading ? <p className="text-caption text-ink-muted">Uploading…</p> : null}
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary CMS URLs
                <img src={url} alt="" className="mt-1 h-28 w-full max-w-xs rounded-control object-cover" />
              ) : null}
            </div>
          );
        }
        const wide = field === "description" || field === "source_url" || field === "website_url" || field === "url";
        return (
          <label key={field} className={`block text-small font-medium text-ink ${wide ? "sm:col-span-2" : ""}`}>
            {label}
            <Input
              className="mt-1.5 font-normal"
              value={values[field] == null ? "" : String(values[field])}
              disabled={disabled}
              onChange={(event) => onChange(field, event.target.value)}
            />
            {FIELD_HINTS[field] ? (
              <span className="mt-1 block font-normal text-caption text-ink-muted">{FIELD_HINTS[field]}</span>
            ) : null}
          </label>
        );
      })}
    </div>
  );
}

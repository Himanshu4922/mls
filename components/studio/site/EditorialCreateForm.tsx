"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StudioAlert, StudioBack, StudioPage } from "@/components/studio/chrome";
import { EditorialFields } from "@/components/studio/site/EditorialFields";
import {
  buildSaveBody,
  EDITORIAL_RESOURCES,
  FIELD_LABELS,
  requiredCreateFields,
  type EditorialResource,
} from "@/components/studio/site/editorialConfig";
import { Button } from "@/components/ui/Button";
import { fetchJson, HttpError } from "@/lib/queries/fetcher";

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

export function EditorialCreateForm({ resource }: { resource: EditorialResource }) {
  const config = EDITORIAL_RESOURCES[resource];
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...config.createDefaults }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  function patch(field: string, value: unknown) {
    setError(null);
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function uploadImage(field: string, file: File) {
    setUploading(true);
    setError(null);
    if (file.size > 8 * 1024 * 1024) {
      setError("Images must be 8 MB or smaller.");
      setUploading(false);
      return;
    }
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) {
      setError("Upload a JPEG, PNG, or WebP image.");
      setUploading(false);
      return;
    }
    if (bitmap.width < 800 || bitmap.height < 450) {
      setError("Use an image at least 800×450 pixels so it stays sharp on the site.");
      bitmap.close();
      setUploading(false);
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
      patch(field, data.url);
    } catch (caught) {
      setError(errorMessage(caught, "Could not upload that image."));
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    for (const field of requiredCreateFields(resource)) {
      if (!String(values[field] ?? "").trim()) {
        setError(`${FIELD_LABELS[field] || field} is required.`);
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      await fetchJson(`/api/studio/editorial/${resource}`, {
        method: "POST",
        body: buildSaveBody(values, config.fields),
        fallback: "Could not create that.",
      });
      router.push(`${config.listHref}?created=1`);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught, "Could not create that."));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <StudioBack href={config.listHref}>Back to {config.title.toLowerCase()}</StudioBack>
      <StudioPage
        kicker="Editorial"
        title={config.createTitle}
        description={config.createLede}
        actions={
          <Button type="button" variant="primary" size="sm" disabled={busy || uploading} onClick={() => void submit()}>
            {busy ? "Creating…" : "Create"}
          </Button>
        }
      >
        {error ? <StudioAlert>{error}</StudioAlert> : null}
        <div className="rounded-surface border border-line bg-surface p-5 shadow-card sm:p-6">
          <EditorialFields
            resource={resource}
            fields={config.fields}
            values={values}
            disabled={busy}
            uploading={uploading}
            onChange={patch}
            onUpload={(field, file) => void uploadImage(field, file)}
          />
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <Button type="button" variant="primary" disabled={busy || uploading} onClick={() => void submit()}>
              {busy ? "Creating…" : "Create"}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => router.push(config.listHref)}>
              Cancel
            </Button>
          </div>
        </div>
      </StudioPage>
    </div>
  );
}

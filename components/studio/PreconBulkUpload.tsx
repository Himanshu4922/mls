"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { BulkUploadResult } from "@/lib/api/studioAdmin";
import { useBulkUploadPrecon } from "@/lib/queries/studioAdmin";

const COLUMNS =
  "wp_id, title, slug, status, price, bedrooms, bathrooms, garages, area, lot_size, latitude, longitude, address";

/**
 * CSV/Excel import over the existing bulk endpoint. Rows upsert by `wp_id`,
 * so re-uploading a corrected sheet updates projects instead of duplicating.
 */
export function PreconBulkUpload() {
  const input = useRef<HTMLInputElement>(null);
  const upload = useBulkUploadPrecon();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkUploadResult | null>(null);

  async function submit() {
    if (!file) return;
    setResult(null);
    try {
      setResult(await upload.mutateAsync(file));
      setFile(null);
      if (input.current) input.current.value = "";
    } catch {
      // Shown below from upload.error.
    }
  }

  return (
    <details className="group rounded-surface border border-line bg-surface">
      <summary className="cursor-pointer list-none px-4 py-3 text-small font-medium text-ink">
        <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden="true">
          ›
        </span>
        Import projects from a spreadsheet
      </summary>
      <div className="space-y-3 border-t border-line px-4 py-4">
        <p className="text-caption text-ink-muted">
          Upload a .csv or .xlsx file with these columns: <code className="text-ink">{COLUMNS}</code>.{" "}
          <code className="text-ink">wp_id</code> is required. A row with an existing wp_id updates that project;
          photos, documents and details are then added in the editor.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={input}
            type="file"
            accept=".csv,.xlsx,.xls"
            aria-label="Spreadsheet to import"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-caption text-ink file:mr-3 file:rounded-control file:border file:border-line file:bg-surface-alt file:px-3 file:py-1.5 file:text-caption file:font-medium"
          />
          <Button size="sm" onClick={() => void submit()} disabled={!file} loading={upload.isPending}>
            Import
          </Button>
        </div>
        {upload.error && (
          <p role="alert" className="text-caption text-negative">
            {upload.error.message}
          </p>
        )}
        {result && (
          <div role="status" className="rounded-control bg-surface-alt p-3 text-caption text-ink">
            <p>
              {result.created} created · {result.updated} updated · {result.skipped} skipped
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-negative">
                {result.errors.slice(0, 20).map((error) => (
                  <li key={`${error.row}-${error.wpId}`}>
                    Row {error.row}
                    {error.wpId ? ` (wp_id ${error.wpId})` : ""}: {error.error}
                  </li>
                ))}
                {result.errors.length > 20 && <li>…and {result.errors.length - 20} more</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

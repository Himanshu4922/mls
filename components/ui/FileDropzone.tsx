"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils/cn";
import { IconButton } from "@/components/ui/Button";

/**
 * Drag-and-drop file picker with a per-file list.
 *
 * It validates and lists files; it does not upload them. The caller owns upload
 * state and passes it back through `items`, so the same control serves draft
 * forms (upload later) and immediate uploads (progress per file).
 *
 * Visual: dashed `rounded-surface` well on surface-alt, in the reference's
 * card vocabulary — HomeAtlasUI has no dropzone, so nothing new is invented.
 */
export interface DropzoneItem {
  id: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  /** 0–100 while uploading. */
  progress?: number;
  error?: string | null;
  /** Caller-defined tag, e.g. "photo" | "floor_plan". */
  kind?: string;
}

export interface DropzoneRejection {
  name: string;
  reason: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({
  label,
  hint,
  accept,
  maxBytes,
  maxFiles,
  items,
  onAdd,
  onRemove,
  disabled,
  renderItemExtra,
}: {
  label: string;
  hint?: string;
  /** MIME types, e.g. ["image/jpeg", "application/pdf"]. */
  accept: string[];
  maxBytes: number;
  maxFiles: number;
  items: DropzoneItem[];
  onAdd: (files: File[], rejected: DropzoneRejection[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  /** Extra control per row, e.g. a photo / floor-plan select. */
  renderItemExtra?: (item: DropzoneItem) => React.ReactNode;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function take(list: FileList | null) {
    if (!list) return;
    const accepted: File[] = [];
    const rejected: DropzoneRejection[] = [];
    let room = maxFiles - items.length;

    for (const file of Array.from(list)) {
      if (!accept.includes(file.type)) {
        rejected.push({ name: file.name, reason: "File type not supported." });
      } else if (file.size > maxBytes) {
        rejected.push({ name: file.name, reason: `Larger than ${formatBytes(maxBytes)}.` });
      } else if (room <= 0) {
        rejected.push({ name: file.name, reason: `Limit of ${maxFiles} files reached.` });
      } else {
        accepted.push(file);
        room -= 1;
      }
    }
    onAdd(accepted, rejected);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) take(event.dataTransfer.files);
  }

  const full = items.length >= maxFiles;

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-surface border-2 border-dashed px-6 py-8 text-center transition-colors",
          "has-focus-visible:border-navy",
          dragging ? "border-navy bg-navy-tint" : "border-line bg-surface-alt hover:border-ink-subtle",
          (disabled || full) && "pointer-events-none opacity-60",
        )}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-navy" aria-hidden="true">
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-small font-medium text-ink">{label}</span>
        <span className="text-caption text-ink-muted">
          {full ? `Limit of ${maxFiles} files reached` : (hint ?? "Drag files here or click to browse")}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={accept.join(",")}
          disabled={disabled || full}
          className="sr-only"
          onChange={(event) => {
            take(event.target.files);
            // Allow re-selecting the same file after removing it.
            event.target.value = "";
          }}
        />
      </label>

      {items.length > 0 && (
        <ul className="divide-y divide-line-soft rounded-surface border border-line bg-surface">
          {items.map((item) => (
            <FileRow
              key={item.id}
              item={item}
              onRemove={() => onRemove(item.id)}
              extra={renderItemExtra?.(item)}
              disabled={disabled}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FileRow({
  item,
  onRemove,
  extra,
  disabled,
}: {
  item: DropzoneItem;
  onRemove: () => void;
  extra?: React.ReactNode;
  disabled?: boolean;
}) {
  const isImage = item.file.type.startsWith("image/");
  const imgRef = useRef<HTMLImageElement>(null);

  // Object URLs must be revoked or every thumbnail leaks until the tab
  // closes. The URL is created and revoked inside one effect and written to
  // the <img> directly, so Strict Mode's mount → unmount → mount can't leave
  // the image pointing at a URL an earlier cleanup already revoked.
  useEffect(() => {
    if (!isImage || !imgRef.current) return;
    const url = URL.createObjectURL(item.file);
    imgRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [item.file, isImage]);

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-alt">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img ref={imgRef} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-eyebrow text-ink-muted">PDF</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-small font-medium text-ink">{item.file.name}</p>
        <p className={cn("text-caption", item.status === "error" ? "text-negative" : "text-ink-muted")}>
          {item.status === "error"
            ? (item.error ?? "Upload failed.")
            : item.status === "uploading"
              ? `Uploading… ${item.progress ?? 0}%`
              : item.status === "done"
                ? `Uploaded · ${formatBytes(item.file.size)}`
                : formatBytes(item.file.size)}
        </p>
        {item.status === "uploading" && (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div className="h-full bg-navy transition-[width]" style={{ width: `${item.progress ?? 0}%` }} />
          </div>
        )}
      </div>
      {extra}
      <IconButton
        label={`Remove ${item.file.name}`}
        size="sm"
        variant="ghost"
        onClick={onRemove}
        disabled={disabled || item.status === "uploading" || item.status === "done"}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </IconButton>
    </li>
  );
}

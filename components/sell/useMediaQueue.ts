"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DropzoneItem, DropzoneRejection } from "@/components/ui/FileDropzone";
import type { SubmissionMediaType } from "@/lib/api/listingSubmissions";
import { prepareUpload, uploadBlocker } from "@/lib/utils/imageResize";
import { uploadMedia } from "@/components/sell/submissionClient";

/** Parallel uploads — enough to keep a connection busy without starving it. */
const CONCURRENCY = 3;

let nextId = 0;
const makeId = () => `media-${Date.now()}-${(nextId += 1)}`;

/**
 * Local upload queue for the photos step.
 *
 * Files are held until the user submits, so they can still pick Photo vs
 * Floor plan per file; `uploadAll` then resizes and sends everything not yet
 * done, three at a time. Already-uploaded items are skipped on a retry, so a
 * flaky connection only re-sends what failed.
 */
export function useMediaQueue() {
  const [items, setItems] = useState<DropzoneItem[]>([]);
  const [rejections, setRejections] = useState<DropzoneRejection[]>([]);
  // uploadAll reads the latest queue without re-creating on every progress tick.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const patch = useCallback((id: string, next: Partial<DropzoneItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }, []);

  const add = useCallback((files: File[], rejected: DropzoneRejection[]) => {
    const extra: DropzoneRejection[] = [];
    const accepted: DropzoneItem[] = [];
    for (const file of files) {
      // PDFs can't be shrunk client-side; catch oversize ones now, not at submit.
      const blocker = uploadBlocker(file);
      if (blocker) extra.push({ name: file.name, reason: blocker });
      else
        accepted.push({
          id: makeId(),
          file,
          status: "queued",
          kind: file.type === "application/pdf" ? "floor_plan" : "photo",
        });
    }
    setRejections([...rejected, ...extra]);
    setItems((current) => [...current, ...accepted]);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const setKind = useCallback(
    (id: string, kind: SubmissionMediaType) => patch(id, { kind }),
    [patch],
  );

  /** Uploads every pending item. Resolves true only when all are done. */
  const uploadAll = useCallback(
    async (submissionId: number, startOrder: number): Promise<boolean> => {
      const pending = itemsRef.current.filter((item) => item.status !== "done");
      const baseIndex = new Map(itemsRef.current.map((item, index) => [item.id, index]));
      let failed = false;
      let cursor = 0;

      async function worker() {
        while (cursor < pending.length) {
          const item = pending[cursor];
          cursor += 1;
          patch(item.id, { status: "uploading", progress: 0, error: null });
          try {
            const file = await prepareUpload(item.file);
            await uploadMedia(
              submissionId,
              file,
              (item.kind as SubmissionMediaType) ?? "photo",
              startOrder + (baseIndex.get(item.id) ?? 0),
              (progress) => patch(item.id, { progress }),
            );
            patch(item.id, { status: "done", progress: 100 });
          } catch (error) {
            failed = true;
            patch(item.id, {
              status: "error",
              error: error instanceof Error ? error.message : "Upload failed.",
            });
          }
        }
      }

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));
      return !failed;
    },
    [patch],
  );

  const reset = useCallback(() => {
    setItems([]);
    setRejections([]);
  }, []);

  return { items, rejections, add, remove, setKind, uploadAll, reset };
}

export type MediaQueue = ReturnType<typeof useMediaQueue>;

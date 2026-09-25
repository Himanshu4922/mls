"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type {
  BulkUploadResult,
  DecisionInput,
  ReviewSubmission,
  StudioPrecon,
  StudioPreconInput,
  StudioPreconSummary,
  UploadedAsset,
} from "@/lib/api/studioAdmin";
import { fetchJson } from "@/lib/queries/fetcher";

/**
 * Staff Studio writes (scope #2d). Lists stay server-rendered like the blog
 * Studio, so list-changing writes end in `router.refresh()`.
 */

export function useSavePrecon() {
  const router = useRouter();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number | null; payload: StudioPreconInput }) => {
      const data = await fetchJson<{ project: StudioPrecon }>(id ? `/api/studio/precon/${id}` : "/api/studio/precon", {
        method: id ? "PATCH" : "POST",
        body: payload,
        fallback: "Could not save the project.",
      });
      return data.project;
    },
    onSuccess: () => router.refresh(),
  });
}

export function useDeletePrecon() {
  return useMutation({
    mutationFn: (id: number) =>
      fetchJson<unknown>(`/api/studio/precon/${id}`, { method: "DELETE", fallback: "Could not delete the project." }),
  });
}

export function useUploadPreconAsset() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file, file.name);
      const data = await fetchJson<{ asset: UploadedAsset }>("/api/studio/precon/assets", {
        method: "POST",
        body: form,
        fallback: "Could not upload that file.",
      });
      return data.asset;
    },
  });
}

export function useBulkUploadPrecon() {
  const router = useRouter();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file, file.name);
      const data = await fetchJson<{ result: BulkUploadResult }>("/api/studio/precon/bulk", {
        method: "POST",
        body: form,
        fallback: "Could not import that file.",
      });
      return data.result;
    },
    onSuccess: () => router.refresh(),
  });
}

export async function searchStudioPrecon(q: string): Promise<StudioPreconSummary[]> {
  const data = await fetchJson<{ items: StudioPreconSummary[] }>(`/api/studio/precon?q=${encodeURIComponent(q)}`, {
    fallback: "Could not search projects.",
  });
  return data.items;
}

export function useDecideSubmission(id: number) {
  const router = useRouter();
  return useMutation({
    mutationFn: async (input: DecisionInput) => {
      const data = await fetchJson<{ submission: ReviewSubmission & { emailed: boolean } }>(
        `/api/studio/submissions/${id}/decision`,
        { method: "POST", body: input, fallback: "Could not record that decision." },
      );
      return data.submission;
    },
    onSuccess: () => router.refresh(),
  });
}

export function useLinkSubmissionPrecon(id: number) {
  const router = useRouter();
  return useMutation({
    mutationFn: async (preconId: number | null) => {
      const data = await fetchJson<{ submission: ReviewSubmission }>(`/api/studio/submissions/${id}/precon`, {
        method: "PATCH",
        body: { precon_property: preconId },
        fallback: "Could not link that project.",
      });
      return data.submission;
    },
    onSuccess: () => router.refresh(),
  });
}

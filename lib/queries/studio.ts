"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { StudioPost, StudioPostInput, TeamMember, TeamRole } from "@/lib/api/studio";
import type { BlogCategory } from "@/lib/api/blog";
import { fetchJson, httpErrorFrom, HttpError, NETWORK_ERROR_STATUS } from "@/lib/queries/fetcher";

/**
 * Studio writes. Studio lists (posts, team) stay server-rendered, so these
 * touch no query cache; the list-changing ones end in `router.refresh()`.
 */

export interface SavePostVars {
  /** Current slug; empty for a post that has never been saved (POST). */
  slug: string;
  payload: StudioPostInput & { expected_updated_at?: string };
}

/**
 * Create (no slug) or update a post. No refresh here: PostEditor autosaves
 * drafts every few seconds and decides itself when to navigate / refresh.
 */
export function useSavePost() {
  return useMutation({
    mutationFn: async ({ slug, payload }: SavePostVars) => {
      const data = await fetchJson<{ post: StudioPost }>(
        slug ? `/api/studio/posts/${encodeURIComponent(slug)}` : "/api/studio/posts",
        { method: slug ? "PATCH" : "POST", body: payload, fallback: "Could not save the post." },
      );
      return data.post;
    },
  });
}

export function useDeletePost() {
  const router = useRouter();
  return useMutation({
    mutationFn: (slug: string) =>
      fetchJson<unknown>(`/api/studio/posts/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        fallback: "Could not delete the post.",
      }),
    onSuccess: () => router.refresh(),
  });
}

export function useCreateCategory() {
  return useMutation({
    mutationFn: async (name: string) => {
      const data = await fetchJson<{ category: BlogCategory }>("/api/studio/categories", {
        method: "POST",
        body: { name },
        fallback: "Could not create that category.",
      });
      return data.category;
    },
  });
}

export function useGrantStudioAccess() {
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: TeamRole }) => {
      const data = await fetchJson<{ member: TeamMember }>("/api/studio/team", {
        method: "POST",
        body: { email, role },
        fallback: "Could not grant access.",
      });
      return data.member;
    },
  });
}

export function useUpdateStudioRole() {
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: number; role: TeamRole }) => {
      const data = await fetchJson<{ member: TeamMember }>(`/api/studio/team/${memberId}`, {
        method: "PATCH",
        body: { role },
        fallback: "Could not update access.",
      });
      return data.member;
    },
  });
}

export function useRevokeStudioAccess() {
  return useMutation({
    mutationFn: (memberId: number) =>
      fetchJson<unknown>(`/api/studio/team/${memberId}`, {
        method: "DELETE",
        fallback: "Could not revoke access.",
      }),
  });
}

/** Multipart, so it can't go through fetchJson (which JSON-encodes bodies). */
export function useUploadStudioImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const fallback = "Could not upload that image.";
      let response: Response;
      try {
        response = await fetch("/api/studio/uploads", { method: "POST", body: form });
      } catch {
        throw new HttpError(fallback, NETWORK_ERROR_STATUS);
      }
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) throw httpErrorFrom(response.status, data, fallback);
      return data as { url: string };
    },
  });
}

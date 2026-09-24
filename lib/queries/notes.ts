"use client";

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserKeys } from "@/components/providers/AuthProvider";
import type { PropertyNoteEntry } from "@/lib/api/watched";
import { fetchJson } from "@/lib/queries/fetcher";
import { qk, type UserKeys } from "@/lib/queries/keys";

/**
 * Property notes. Two cache shapes share one source of truth:
 *
 * - `keys.notes` — every note, for the Watched "Notes" tab and menu
 * - `keys.note(listingKey)` — one note, for the editor on a property page
 *
 * Saving writes BOTH, so an edit on a property page shows in the Notes tab
 * without a refetch, and a single note is seeded from the list when present.
 */

export interface NoteValue {
  body: string;
  updatedAt: string | null;
}

export function notesListQuery(keys: UserKeys) {
  return queryOptions({
    queryKey: keys.notes,
    queryFn: async ({ signal }) => {
      const data = await fetchJson<{ results?: PropertyNoteEntry[] }>("/api/notes", {
        signal,
        fallback: "Could not load notes.",
      });
      return data?.results ?? [];
    },
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

/** Every note the user has written. `enabled` lets a caller defer further. */
export function useNotesList(enabled = true) {
  const keys = useUserKeys();
  return useQuery({
    ...notesListQuery(keys ?? qk.me(-1)),
    enabled: enabled && keys !== null,
  });
}

/** One property's note. Reads the list cache first so opening it is instant. */
export function useNote(listingKey: string) {
  const keys = useUserKeys();
  const queryClient = useQueryClient();
  const scoped = keys ?? qk.me(-1);
  return useQuery({
    queryKey: scoped.note(listingKey),
    enabled: keys !== null,
    queryFn: async ({ signal }): Promise<NoteValue> => {
      const data = await fetchJson<{ body?: string; updatedAt?: string | null }>(
        `/api/notes?listing_key=${encodeURIComponent(listingKey)}`,
        { signal, fallback: "Could not load your note." },
      );
      return { body: data?.body ?? "", updatedAt: data?.updatedAt ?? null };
    },
    initialData: () => {
      const list = queryClient.getQueryData<PropertyNoteEntry[]>(scoped.notes);
      const hit = list?.find((entry) => entry.listingKey === listingKey);
      return hit ? { body: hit.body, updatedAt: hit.updatedAt } : undefined;
    },
    // Seeded data is as old as the list it came from.
    initialDataUpdatedAt: () => queryClient.getQueryState(scoped.notes)?.dataUpdatedAt,
    staleTime: 30_000,
  });
}

/** Saves a note and writes the result into both note caches. */
export function useSaveNote(listingKey: string) {
  const keys = useUserKeys();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      fetchJson<{ body?: string; updatedAt?: string | null }>("/api/notes", {
        method: "PUT",
        body: { listing_key: listingKey, body },
        fallback: "Could not save your note.",
      }),
    onSuccess: (data, body) => {
      if (!keys) return;
      const saved: NoteValue = { body: data?.body ?? body, updatedAt: data?.updatedAt ?? null };
      queryClient.setQueryData(keys.note(listingKey), saved);
      queryClient.setQueryData<PropertyNoteEntry[]>(keys.notes, (list) => {
        if (!list) return list;
        const rest = list.filter((entry) => entry.listingKey !== listingKey);
        // The backend lists non-empty notes only, newest first.
        if (!saved.body.trim()) return rest;
        const existing = list.find((entry) => entry.listingKey === listingKey);
        return [
          {
            ...(existing ?? { createdAt: saved.updatedAt }),
            listingKey,
            body: saved.body,
            updatedAt: saved.updatedAt,
          } as PropertyNoteEntry,
          ...rest,
        ];
      });
    },
  });
}

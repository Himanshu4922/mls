"use client";

import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import type { SchoolSearchHit } from "@/lib/api/schools";
import { SCHOOL_SEARCH_MIN_CHARS } from "@/lib/api/schools";
import { fetchJson } from "@/lib/queries/fetcher";
import { qk } from "@/lib/queries/keys";

export function schoolSearchQuery(q: string) {
  const term = q.trim();
  return queryOptions({
    queryKey: qk.schools.search(term),
    queryFn: ({ signal }) =>
      fetchJson<SchoolSearchHit[]>(`/api/schools/search?q=${encodeURIComponent(term)}`, {
        signal,
      }),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
}

/**
 * School name suggestions. Pass an already-debounced value; prior hits stay
 * visible while the next set loads.
 */
export function useSchoolSearch(q: string) {
  return useQuery({
    ...schoolSearchQuery(q),
    enabled: q.trim().length >= SCHOOL_SEARCH_MIN_CHARS,
    placeholderData: keepPreviousData,
  });
}

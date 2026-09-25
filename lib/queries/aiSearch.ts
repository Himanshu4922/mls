"use client";

import { useMutation } from "@tanstack/react-query";
import type { AiSearchFilters, AiSearchResult } from "@/lib/api/aiSearch";
import { fetchJson } from "@/lib/queries/fetcher";

/** Sentence → filters, via `/api/ai-search`. Not retried: a retry re-bills. */
export function useAiSearch() {
  return useMutation({
    retry: false,
    mutationFn: (input: { query: string; currentFilters?: Partial<AiSearchFilters> | null }) =>
      fetchJson<AiSearchResult>("/api/ai-search", {
        method: "POST",
        body: input,
        fallback: "AI search is unavailable right now.",
      }),
  });
}

/* -------------------------------------------------------------------------- */
/* The note shown on the results page after an AI search                      */
/* -------------------------------------------------------------------------- */

const NOTICE_KEY = "ha-ai-search";

export interface AiSearchNoticeData {
  /** Querystring of the results page the search produced (no "?"). */
  qs: string;
  prompt: string;
  unsupported: string[];
  fallback: boolean;
}

/** sessionStorage can throw (private mode, blocked storage); the note is optional. */
export function saveAiSearchNotice(data: AiSearchNoticeData) {
  try {
    sessionStorage.setItem(NOTICE_KEY, JSON.stringify(data));
  } catch {
    /* no note, search still works */
  }
}

export function readAiSearchNotice(): AiSearchNoticeData | null {
  try {
    const raw = sessionStorage.getItem(NOTICE_KEY);
    const data = raw ? (JSON.parse(raw) as AiSearchNoticeData) : null;
    return data && typeof data.qs === "string" && typeof data.prompt === "string" ? data : null;
  } catch {
    return null;
  }
}

export function clearAiSearchNotice() {
  try {
    sessionStorage.removeItem(NOTICE_KEY);
  } catch {
    /* ignore */
  }
}

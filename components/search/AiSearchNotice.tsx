"use client";

import { useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { SparkleIcon } from "@/components/search/AiSearchBox";
import { clearAiSearchNotice, readAiSearchNotice } from "@/lib/queries/aiSearch";
import { buildListingQueryString, parseListingSearch } from "@/lib/utils/searchParams";

/**
 * "Showing results for …" after an AI search: what was asked, anything the AI
 * could not turn into a filter, and whether it fell back to keywords. Shown
 * only while the page still shows exactly the search the AI produced — once
 * the visitor edits a filter it is their search, and the note would mislead.
 */
export function AiSearchNotice() {
  const params = useSearchParams();
  // Remembers WHICH note was dismissed, so a later AI search still shows its own.
  const [dismissed, setDismissed] = useState<string | null>(null);
  // sessionStorage is browser-only: the server snapshot is "no note", so the
  // first client render matches the server HTML and the note appears after.
  const raw = useSyncExternalStore(subscribe, readRawNotice, () => null);
  const notice = raw ? readAiSearchNotice() : null;

  if (!notice || raw === dismissed) return null;
  const pageQs = buildListingQueryString({ ...parseListingSearch(params), page: undefined, view: undefined });
  const noticeQs = buildListingQueryString({ ...parseListingSearch(notice.qs), page: undefined, view: undefined });
  if (pageQs !== noticeQs) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-surface border border-line bg-surface-alt px-4 py-3 text-small text-ink">
      <SparkleIcon className="mt-0.5 text-gold-deep" />
      <div className="flex-1 space-y-1">
        <p>
          {notice.fallback ? "AI search is unavailable, so we searched for the words in " : "Showing homes for "}
          <span className="font-medium">“{notice.prompt}”</span>
          {notice.fallback ? "." : ". Remove or change any filter below."}
        </p>
        {notice.unsupported.length > 0 && (
          <p className="text-caption text-ink-muted">
            Not searchable yet: {notice.unsupported.join(", ")}.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          clearAiSearchNotice();
          setDismissed(raw);
        }}
        aria-label="Dismiss"
        className="flex h-6 w-6 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface hover:text-ink"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function subscribe() {
  // Written by AiSearchBox right before it navigates here; nothing to watch.
  return () => {};
}

function readRawNotice(): string | null {
  try {
    return sessionStorage.getItem("ha-ai-search");
  } catch {
    return null;
  }
}

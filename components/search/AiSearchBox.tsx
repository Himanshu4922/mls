"use client";

import { useId, useState, type FormEvent } from "react";
import { usePendingNavigation } from "@/components/navigation/PendingNavigation";
import { Button } from "@/components/ui/Button";
import { AI_QUERY_MAX_CHARS, aiFiltersToQuery, queryToAiFilters } from "@/lib/api/aiSearch";
import { saveAiSearchNotice, useAiSearch } from "@/lib/queries/aiSearch";
import { HttpError } from "@/lib/queries/fetcher";
import type { ListingQuery } from "@/lib/types/domain";
import { buildListingQueryString, hasActiveFilters } from "@/lib/utils/searchParams";
import { cn } from "@/lib/utils/cn";

const EXAMPLES = [
  "3 bed condo under $900K near a subway in Toronto",
  "Family home in Oakville with a big backyard and double garage",
  "2 bedroom rental downtown under $3,000/month with parking",
  "Detached house in Vaughan with a basement apartment",
];

/**
 * AI search box: a sentence becomes ordinary listing filters (backend +
 * OpenAI), then we navigate to the normal results page, where each filter is
 * a removable pill and "Best match" ranks by the soft preferences.
 *
 * `current` switches on refine mode ("cheaper", "add a garage"): the
 * visitor's applied filters are sent along so the AI edits them rather than
 * starting over; a checkbox lets them start fresh instead. A drawn map area
 * is always kept — the AI can't draw one.
 *
 * If the AI is unavailable the sentence runs as a plain keyword search, so
 * the box never dead-ends. Only a rate limit stops the navigation.
 */
export function AiSearchBox({
  basePath = "/listings",
  current,
  variant = "hero",
  className,
}: {
  basePath?: "/listings" | "/map-search";
  current?: ListingQuery;
  variant?: "hero" | "inline";
  className?: string;
}) {
  // On /listings and /map-search this shows the skeleton while results load.
  const { navigate } = usePendingNavigation();
  const id = useId();
  const search = useAiSearch();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canRefine = Boolean(current && hasActiveFilters(current));
  const [keepFilters, setKeepFilters] = useState(true);
  const refining = canRefine && keepFilters;

  function go(query: ListingQuery, notice: { unsupported: string[]; fallback: boolean }, prompt: string) {
    const next: ListingQuery = {
      ...query,
      polygon: current?.polygon,
      view: current?.view,
    };
    const qs = buildListingQueryString(next);
    saveAiSearchNotice({ qs, prompt, ...notice });
    navigate(qs ? `${basePath}?${qs}` : basePath);
  }

  function submit(prompt: string) {
    const trimmed = prompt.trim().slice(0, AI_QUERY_MAX_CHARS);
    if (!trimmed || search.isPending) return;
    setError(null);
    search.mutate(
      { query: trimmed, currentFilters: refining && current ? queryToAiFilters(current) : null },
      {
        onSuccess: (result) =>
          go(
            aiFiltersToQuery(result.filters ?? {}),
            { unsupported: result.unsupported ?? [], fallback: Boolean(result.fallback) },
            trimmed,
          ),
        onError: (err) => {
          if (err instanceof HttpError && (err.status === 429 || err.status === 400)) {
            setError(
              err.status === 429
                ? "You've run a lot of AI searches — please wait a few minutes, or use the filters."
                : err.message,
            );
            return;
          }
          // AI down: the words still search, as keywords.
          go({ search: trimmed.slice(0, 120) }, { unsupported: [], fallback: true }, trimmed);
        },
      },
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit(text);
  }

  const hero = variant === "hero";
  const placeholder = refining
    ? "Refine these results — e.g. “cheaper”, “add a garage”, “only Mississauga”"
    : "Describe your ideal home — e.g. “3 bed condo under $900K near a subway”";

  return (
    <form onSubmit={onSubmit} className={cn("w-full", className)} aria-busy={search.isPending}>
      <label htmlFor={id} className={hero ? "sr-only" : "mb-1.5 flex items-center gap-1.5 text-small font-medium text-ink"}>
        {!hero && <SparkleIcon />}
        {refining ? "Refine with AI" : "Search with AI"}
      </label>
      <div className={cn("flex gap-2", hero ? "flex-col" : "flex-col sm:flex-row")}>
        {hero ? (
          <textarea
            id={id}
            rows={3}
            maxLength={AI_QUERY_MAX_CHARS}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              // Enter searches; Shift+Enter keeps a newline.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(text);
              }
            }}
            placeholder={placeholder}
            className="w-full resize-none rounded-control border border-line bg-surface px-4 py-3 text-body text-ink placeholder:text-ink-subtle focus:border-navy focus:outline-none"
          />
        ) : (
          <input
            id={id}
            type="search"
            maxLength={AI_QUERY_MAX_CHARS}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={placeholder}
            className="h-11 min-w-0 flex-1 rounded-control border border-line bg-surface px-3.5 text-small text-ink placeholder:text-ink-subtle focus:border-navy focus:outline-none"
          />
        )}
        <Button
          type="submit"
          variant={hero ? "dark" : "primary"}
          size={hero ? "lg" : "md"}
          block={hero}
          disabled={!text.trim() || search.isPending}
          className="shrink-0"
        >
          {search.isPending ? "Understanding your search…" : hero ? "Search with AI" : "Ask AI"}
          {!search.isPending && <SparkleIcon />}
        </Button>
      </div>

      {canRefine && (
        <label className="mt-2 flex items-center gap-2 text-caption text-ink-muted">
          <input
            type="checkbox"
            checked={keepFilters}
            onChange={(event) => setKeepFilters(event.target.checked)}
            className="h-3.5 w-3.5 accent-navy"
          />
          Keep my current filters
        </label>
      )}

      {error && (
        <p role="alert" className="mt-2 text-caption text-negative">
          {error}
        </p>
      )}

      {hero && (
        <div className="mt-4">
          <p className="mb-2 text-eyebrow uppercase text-ink-muted">Try</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                disabled={search.isPending}
                onClick={() => {
                  setText(example);
                  submit(example);
                }}
                className="rounded-full border border-line px-3 py-1.5 text-left text-caption text-ink transition-colors hover:border-gold hover:text-gold-deep disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

export function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className={cn("shrink-0", className)}>
      <path
        d="M10 2.5l1.6 4.4 4.4 1.6-4.4 1.6L10 14.5l-1.6-4.4L4 8.5l4.4-1.6L10 2.5ZM15.5 13l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

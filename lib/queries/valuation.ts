"use client";

import { keepPreviousData, queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import {
  AUTOCOMPLETE_MIN_CHARS,
  type AddressSuggestion,
  type EstimateInput,
  type ValuationResult,
  type ValuationSubject,
} from "@/lib/api/valuation";
import { fetchJson } from "@/lib/queries/fetcher";
import { qk } from "@/lib/queries/keys";

export function addressAutocompleteQuery(q: string) {
  const term = q.trim();
  return queryOptions({
    queryKey: qk.valuation.autocomplete(term),
    queryFn: ({ signal }) =>
      fetchJson<AddressSuggestion[]>(
        `/api/valuation/autocomplete?q=${encodeURIComponent(term)}`,
        { signal },
      ),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
}

/** Address suggestions for the wizard. Pass an already-debounced value. */
export function useAddressAutocomplete(q: string) {
  return useQuery({
    ...addressAutocompleteQuery(q),
    enabled: q.trim().length >= AUTOCOMPLETE_MIN_CHARS,
    placeholderData: keepPreviousData,
  });
}

/** `/api/valuation/lookup` URL for a chosen suggestion. */
export function valuationLookupUrl(suggestion: Pick<AddressSuggestion, "listingKey" | "label">) {
  const qs = new URLSearchParams({
    listing_key: suggestion.listingKey ?? "",
    address: suggestion.label,
  });
  return `/api/valuation/lookup?${qs.toString()}`;
}

/**
 * Subject-property details for a picked address. A read, but it runs on a
 * user action and its result moves the wizard on, so it is a mutation: one
 * pending flag, no cache entry to keep around.
 */
export function useValuationLookup() {
  return useMutation({
    mutationFn: (suggestion: AddressSuggestion) =>
      fetchJson<ValuationSubject>(valuationLookupUrl(suggestion), {
        fallback: "We couldn't find details for that address.",
      }),
  });
}

/** Runs the comparable-sales model. Nothing cached depends on it. */
export function useValuationEstimate() {
  return useMutation({
    mutationFn: (input: EstimateInput) =>
      fetchJson<ValuationResult>("/api/valuation/estimate", {
        method: "POST",
        body: input,
        fallback: "We couldn't produce an estimate right now.",
      }),
  });
}

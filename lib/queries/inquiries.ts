"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchJson } from "@/lib/queries/fetcher";

/** Body for POST /api/inquiries (forwarded to mls-v2 `inquiries/`). */
export interface InquiryInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  intent: string;
  message: string;
  preferred_locations: string;
  page_url?: string;
  listing_key: string;
  /**
   * Recorded marketing-email consent (mls-v2 `PropertyInquiry.newsletter_opt_in`).
   * Only send true when the visitor ticked an explicit consent box (CASL).
   */
  newsletter_opt_in?: boolean;
}

/** Showing request / listing enquiry. Write-only: no cache entry changes. */
export function useSubmitInquiry() {
  return useMutation({
    mutationFn: (input: InquiryInput) =>
      fetchJson<unknown>("/api/inquiries", {
        method: "POST",
        body: input,
        fallback: "Could not send your request.",
      }),
  });
}

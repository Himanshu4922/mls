"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useUserKeys } from "@/components/providers/AuthProvider";
import { submissionsApi } from "@/components/sell/submissionClient";
import { qk, type UserKeys } from "@/lib/queries/keys";

/**
 * The user's listing / assignment submissions. The wizard and the Watched
 * "My listings" tab share these keys, so a save in one refreshes the other.
 *
 * staleTime 0: review status changes server-side (an admin approves or asks
 * for changes), so a revisit should always revalidate.
 */

export function mySubmissionsQuery(keys: UserKeys) {
  return queryOptions({
    queryKey: keys.submissions,
    queryFn: () => submissionsApi.mine(),
    staleTime: 0,
    gcTime: 10 * 60_000,
  });
}

export function submissionQuery(keys: UserKeys, id: number) {
  return queryOptions({
    queryKey: keys.submission(id),
    queryFn: () => submissionsApi.get(id),
    staleTime: 0,
    gcTime: 10 * 60_000,
  });
}

export function useMySubmissions() {
  const keys = useUserKeys();
  return useQuery({ ...mySubmissionsQuery(keys ?? qk.me(-1)), enabled: keys !== null });
}

export function useSubmission(id: number) {
  const keys = useUserKeys();
  return useQuery({ ...submissionQuery(keys ?? qk.me(-1), id), enabled: keys !== null });
}

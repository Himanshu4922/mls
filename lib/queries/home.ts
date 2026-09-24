"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserKeys } from "@/components/providers/AuthProvider";
import type {
  NearbyActivity,
  NearbyAlert,
  NearbyAlertCreated,
  NearbyAlertInput,
} from "@/lib/api/homeForms";
import { fetchJson } from "@/lib/queries/fetcher";
import { qk } from "@/lib/queries/keys";

/**
 * Homepage forms: newsletter sign-up, nearby-listing alerts and the live
 * activity feed beside the alert form. All go through `/api/home/*`.
 */

export function useSubscribeNewsletter() {
  return useMutation({
    mutationFn: (input: { email: string; source?: string }) =>
      fetchJson<{ subscribed: boolean }>("/api/home/newsletter", {
        method: "POST",
        body: { email: input.email, consent: true, source: input.source },
        fallback: "Could not subscribe you.",
      }),
  });
}

/** The signed-in user's active nearby alerts; idle while signed out. */
export function useNearbyAlerts() {
  const keys = useUserKeys();
  const query = useQuery({
    queryKey: (keys ?? qk.me(-1)).nearbyAlerts,
    queryFn: ({ signal }) =>
      fetchJson<{ results: NearbyAlert[] }>("/api/home/nearby-alerts", {
        signal,
        cache: "no-store",
        fallback: "Could not load your nearby alerts.",
      }).then((data) => data?.results ?? []),
    enabled: keys !== null,
    staleTime: 30_000,
  });
  return { query, alerts: keys ? (query.data ?? []) : [] };
}

export function useCreateNearbyAlert() {
  const queryClient = useQueryClient();
  const keys = useUserKeys();
  return useMutation({
    mutationFn: (input: NearbyAlertInput) =>
      fetchJson<NearbyAlertCreated>("/api/home/nearby-alerts", {
        method: "POST",
        body: input,
        fallback: "Could not save your alert.",
      }),
    onSuccess: () => {
      if (keys) void queryClient.invalidateQueries({ queryKey: keys.nearbyAlerts });
    },
  });
}

export function useDeleteNearbyAlert() {
  const queryClient = useQueryClient();
  const keys = useUserKeys();
  return useMutation({
    mutationFn: (id: number) =>
      fetchJson<void>(`/api/home/nearby-alerts/${id}`, {
        method: "DELETE",
        fallback: "Could not remove this alert.",
      }),
    onSuccess: (_data, id) => {
      if (!keys) return;
      queryClient.setQueryData<NearbyAlert[]>(keys.nearbyAlerts, (rows) =>
        rows?.filter((row) => row.id !== id),
      );
    },
  });
}

/** New listings around `point` (null = nothing picked yet, query idle). */
export function useNearbyActivity(
  point: { lat: number; lng: number } | null,
  { radiusKm = 1, limit = 4 }: { radiusKm?: number; limit?: number } = {},
) {
  // Round like the key does, so one cache entry always means one request.
  const lat = Math.round((point?.lat ?? 0) * 1000) / 1000;
  const lng = Math.round((point?.lng ?? 0) * 1000) / 1000;
  return useQuery({
    queryKey: qk.home.nearbyActivity(lat, lng, radiusKm, limit),
    queryFn: ({ signal }) => {
      const qs = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius_km: String(radiusKm),
        limit: String(limit),
      });
      return fetchJson<NearbyActivity>(`/api/home/nearby-activity?${qs}`, {
        signal,
        fallback: "Could not load nearby activity.",
      });
    },
    enabled: point !== null,
    staleTime: 5 * 60_000,
  });
}

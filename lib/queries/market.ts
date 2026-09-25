"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useUserKeys } from "@/components/providers/AuthProvider";
import type { RecentSalesPage } from "@/lib/api/market";
import { fetchJson } from "@/lib/queries/fetcher";

/** Recently sold homes. Disabled while signed out (the route would 401). */
export function useRecentSales(city: string, days: number, page: number) {
  const keys = useUserKeys();
  return useQuery({
    queryKey: keys?.recentSales(city, days, page) ?? ["me", "anonymous", "recent-sales"],
    queryFn: ({ signal }) =>
      fetchJson<RecentSalesPage>(
        `/api/market/recent-sales?${new URLSearchParams({ city, days: String(days), page: String(page) })}`,
        { signal, fallback: "Could not load recent sales." },
      ),
    enabled: Boolean(keys && city),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60_000,
  });
}

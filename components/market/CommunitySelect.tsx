"use client";

import { usePendingNavigation } from "@/components/navigation/PendingNavigation";
import { Select } from "@/components/ui/Field";
import type { SoldCommunity } from "@/lib/api/market";

/**
 * Community picker for Market Trends. A select (a city can have 60
 * communities, too many for chips) that navigates on change, keeping the
 * other filters. Options come from the sold feed for the chosen city.
 */
export function CommunitySelect({
  communities,
  value,
  hrefFor,
}: {
  communities: SoldCommunity[];
  value: string | null;
  /** URL for a community ("" = all communities). Built on the server. */
  hrefFor: Record<string, string>;
}) {
  const { navigate } = usePendingNavigation();
  return (
    <label className="flex flex-col gap-1 text-caption font-medium text-ink-muted">
      Community
      <Select
        value={value ?? ""}
        onChange={(event) => {
          const href = hrefFor[event.target.value];
          if (href) navigate(href, { scroll: false });
        }}
        className="min-w-56"
      >
        <option value="">All communities</option>
        {communities.map((community) => (
          <option key={community.name} value={community.name}>
            {community.name}
          </option>
        ))}
      </Select>
    </label>
  );
}

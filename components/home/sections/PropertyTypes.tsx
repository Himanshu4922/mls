import Link from "next/link";
import type { ComponentType } from "react";
import {
  IconCondo,
  IconDetached,
  IconLuxury,
  IconOpenHouse,
  IconRental,
  IconTownhome,
} from "@/components/home/icons";
import { Section } from "@/components/ui/Section";
import { safeFetch } from "@/lib/api/client";
import { getPropertyTypes } from "@/lib/api/properties";
import type { UiPropertyType } from "@/lib/types/domain";
import { formatNumber } from "@/lib/utils/format";

/**
 * "Explore by Property Type" (HomeAtlasUI HomePage L354-373).
 *
 * The six tiles are static, as in the reference. Links use the params
 * parseListingParams understands: `type` takes a UI type (UI_PROPERTY_TYPES),
 * open houses use `openHouse=1`.
 *
 * Luxury: the backend has no luxury property type (RESO has no such class and
 * no facet maps to it), so the tile links to a $2M+ price filter instead.
 *
 * Counts: when the property-types facet is reachable, tiles whose `type` maps
 * to a UI type show the live count summed across matching facets. Luxury and
 * Open Houses have no facet, and a failed fetch simply hides all counts.
 */
const TILES: Array<{
  label: string;
  href: string;
  Icon: ComponentType<{ className?: string }>;
  uiType?: UiPropertyType;
}> = [
  { label: "Detached", href: "/listings?type=Detached", Icon: IconDetached, uiType: "Detached" },
  { label: "Condos", href: "/listings?type=Condo", Icon: IconCondo, uiType: "Condo" },
  { label: "Townhomes", href: "/listings?type=Townhome", Icon: IconTownhome, uiType: "Townhome" },
  { label: "Luxury", href: "/listings?priceMin=2000000", Icon: IconLuxury },
  { label: "Open Houses", href: "/listings?openHouse=1", Icon: IconOpenHouse },
  { label: "Rentals", href: "/listings?tx=rent", Icon: IconRental, uiType: "Rental" },
];

export async function PropertyTypes() {
  const facets = await safeFetch(getPropertyTypes(), [], "home:property-types");
  const counts = new Map<string, number>();
  for (const facet of facets) {
    if (!facet.uiType || facet.count <= 0) continue;
    counts.set(facet.uiType, (counts.get(facet.uiType) ?? 0) + facet.count);
  }

  return (
    <Section tone="alt" title="Explore by Property Type" className="border-y border-line">
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {TILES.map(({ label, href, Icon, uiType }) => {
          const count = uiType ? counts.get(uiType) : undefined;
          return (
            <li key={label} className="h-full">
              <Link
                href={href}
                className="group flex h-full flex-col items-start gap-5 rounded-control border border-transparent bg-surface p-5 shadow-card transition-all hover:border-gold/20 hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              >
                <Icon className="transition-transform group-hover:scale-110" />
                <span className="flex w-full items-baseline justify-between gap-2">
                  <span className="text-small font-medium text-ink">{label}</span>
                  {count !== undefined && (
                    <span className="text-caption text-ink-muted">{formatNumber(count)}</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

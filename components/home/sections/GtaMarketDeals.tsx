import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Section } from "@/components/ui/Section";
import { getMarketDeals } from "@/lib/api/home";
import { dealHref, formatDay, type PriceDropDeal } from "@/lib/api/homeMappers";
import { marketDeals } from "@/lib/home/staticSections";
import { formatPrice } from "@/lib/utils/format";
import { buildListingHref } from "@/lib/utils/searchParams";
import { DealGlyph } from "./sectionIcons";

/**
 * "GTA Market Deals" — HomeAtlasUI HomePage L540-612 ("DEALS SECTION").
 *
 * LIVE from `/api/home/deals/`: the biggest recent price reductions across the
 * GTA (AMPRE), with was/now prices and the drop. A deal that matches a listing
 * in our catalogue opens its property page; one that doesn't opens a /listings
 * search for its address.
 *
 * When the feed is down (503) or empty, the reference's category cards render
 * instead — each a real link to the search it describes; their counts are the
 * reference's sample figures.
 */
export async function GtaMarketDeals() {
  const deals = await getMarketDeals(4);
  const live = deals !== null && deals.length > 0;

  return (
    <Section
      tone="alt"
      eyebrow="Exclusive opportunities"
      title="GTA Market Deals"
    >
      {live && (
        <p className="-mt-3 mb-6 text-caption text-ink-subtle sm:-mt-5 sm:mb-8">
          Largest recent price reductions on active GTA listings
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {live ? (
          deals.map((deal) => <DealCard key={deal.mlsNumber} deal={deal} />)
        ) : (
          <SampleDeals />
        )}
      </div>
    </Section>
  );
}

function DealCard({ deal }: { deal: PriceDropDeal }) {
  const facts = [
    deal.city,
    deal.propertySubType,
    deal.bedrooms ? `${deal.bedrooms} bd` : null,
    deal.bathrooms ? `${deal.bathrooms} ba` : null,
  ].filter(Boolean);
  return (
    <Link
      href={dealHref(deal)}
      className="group flex flex-col rounded-surface border border-line bg-surface p-6 transition-all hover:border-gold/30 hover:shadow-card-hover"
    >
      <div className="mb-4 flex items-start justify-between">
        <DealGlyph icon="distress" className="h-8 w-8 text-gold" />
        <Badge tone="gold" className="text-eyebrow font-bold">
          -{deal.dropPct.toFixed(1)}%
        </Badge>
      </div>
      <h3 className="mb-1 text-h3 text-ink">
        {deal.address || `MLS® ${deal.mlsNumber}`}
      </h3>
      <p className="mb-4 flex-1 text-small text-ink-muted">
        {facts.join(" · ")}
      </p>
      <dl className="mb-4 space-y-1 text-small">
        <div className="flex justify-between">
          <dt className="text-ink-muted">Was</dt>
          <dd className="text-ink-muted line-through">
            {formatPrice(deal.originalPrice)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Now</dt>
          <dd className="font-semibold text-ink">
            {formatPrice(deal.listPrice)}
          </dd>
        </div>
      </dl>
      <div className="flex items-center justify-between">
        <span className="text-caption font-semibold text-navy">
          {deal.changedOn
            ? `Reduced ${formatDay(deal.changedOn)}`
            : `Down ${formatPrice(deal.dropAmount)}`}
        </span>
        <span className="text-small font-medium text-ink transition-colors group-hover:text-gold">
          View →
        </span>
      </div>
    </Link>
  );
}

function SampleDeals() {
  return marketDeals.map((deal) => (
    <Link
      key={deal.title}
      href={buildListingHref(deal.query)}
      className="group flex flex-col rounded-surface border border-line bg-surface p-6 transition-all hover:border-gold/30 hover:shadow-card-hover"
    >
      <div className="mb-4 flex items-start justify-between">
        <DealGlyph icon={deal.icon} className="h-8 w-8 text-gold" />
        <Badge tone={deal.badgeTone} className="text-eyebrow font-bold">
          {deal.badge}
        </Badge>
      </div>
      <h3 className="mb-2 text-h3 text-ink">{deal.title}</h3>
      <p className="mb-4 flex-1 text-small text-ink-muted">{deal.desc}</p>
      <div className="flex items-center justify-between">
        <span className="text-caption font-semibold text-navy">
          {deal.count}
        </span>
        <span className="text-small font-medium text-ink transition-colors group-hover:text-gold">
          Browse →
        </span>
      </div>
    </Link>
  ));
}

import { SafeImage } from "@/components/ui/SafeImage";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Section } from "@/components/ui/Section";
import { getSoldBelowPurchase } from "@/lib/api/home";
import { formatDay, type SoldBelowRow } from "@/lib/api/homeMappers";
import { formatFullPrice, properties } from "@/lib/home/sampleData";
import { soldBelowPicks } from "@/lib/home/staticSections";
import { formatPrice } from "@/lib/utils/format";
import { buildListingHref } from "@/lib/utils/searchParams";

/**
 * "Sold Below Last Purchase" — HomeAtlasUI HomePage L613-667.
 *
 * LIVE from `/api/home/sold-below-purchase/`, a table the nightly job fills
 * with GTA homes whose latest sale closed below their previous sale. These are
 * sold homes that aren't in our active catalogue, so live rows carry no
 * property link; the section action opens the sold search.
 *
 * Until the job has produced rows (or if the feed fails), the reference's
 * sample records render instead. The reference's badge read
 * "-5.0% below ask", but the percentage is measured against the previous
 * purchase price, not the asking price, so the badge says that instead.
 * Cards open the sold search for the same city and type.
 */
export async function SoldBelowLastPurchase() {
  const rows = await getSoldBelowPurchase(3);
  const live = rows !== null && rows.length > 0;

  return (
    <Section
      eyebrow="Buyer's opportunity"
      title="Sold Below Last Purchase"
      description="Properties that recently sold below their previous purchase price — potential value opportunities"
      action={{
        label: "View All Sold Data",
        href: buildListingHref({ status: "Sold" }),
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {live ? (
          rows.map((row) => <SoldRow key={row.listingKey} row={row} />)
        ) : (
          <SampleCards />
        )}
      </div>
    </Section>
  );
}

function SoldRow({ row }: { row: SoldBelowRow }) {
  const pct = ((row.lossAmount / row.previousClosePrice) * 100).toFixed(1);
  const facts = [
    row.city,
    row.propertySubType,
    row.bedrooms ? `${row.bedrooms} bd` : null,
    row.bathrooms ? `${row.bathrooms} ba` : null,
  ].filter(Boolean);
  return (
    <article className="flex flex-col rounded-surface border border-line bg-surface p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <Badge tone="navy" className="font-bold">
          {pct}% below last purchase
        </Badge>
        <Badge tone="warm" className="shrink-0 px-2 py-0.5 font-bold">
          -{formatPrice(row.lossAmount)}
        </Badge>
      </div>
      <p className="truncate text-small font-medium text-ink">{row.address}</p>
      <p className="mb-4 mt-0.5 text-caption text-ink-muted">
        {facts.join(" · ")}
      </p>
      <dl className="mt-auto space-y-1 text-small">
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">Sold {formatDay(row.closeDate)}</dt>
          <dd className="font-semibold text-ink">
            {formatPrice(row.closePrice)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">
            Bought {formatDay(row.previousCloseDate)}
          </dt>
          <dd className="text-ink-muted line-through">
            {formatPrice(row.previousClosePrice)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function SampleCards() {
  const cards = soldBelowPicks.flatMap((pick) => {
    const prop = properties.find((p) => p.id === pick.id);
    if (!prop?.soldPrice) return [];
    const diff = prop.soldPrice - pick.prevPrice;
    const pct = Math.abs((diff / pick.prevPrice) * 100).toFixed(1);
    return [{ ...pick, prop, soldPrice: prop.soldPrice, diff, pct }];
  });

  return cards.map(({ id, prop, soldPrice, prevPrice, diff, pct, desc }) => (
    <Link
      key={id}
      href={buildListingHref({
        city: prop.community,
        type: prop.type,
        status: "Sold",
      })}
      className="group overflow-hidden rounded-surface border border-line bg-surface transition-shadow hover:shadow-card-hover"
    >
      <div className="relative h-[180px] overflow-hidden">
        <SafeImage
          src={prop.image}
          alt={prop.address}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <Badge tone="navy" className="absolute left-3 top-3 font-bold">
          {pct}% below last purchase
        </Badge>
      </div>
      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div>
            <p className="text-h3 text-ink">{formatFullPrice(soldPrice)}</p>
            <p className="text-caption text-ink-muted line-through">
              Prev: {formatFullPrice(prevPrice)}
            </p>
          </div>
          <Badge tone="warm" className="shrink-0 px-2 py-0.5 font-bold">
            Saved {formatFullPrice(Math.abs(diff))}
          </Badge>
        </div>
        <p className="truncate text-small font-medium text-ink">
          {prop.address}
        </p>
        <p className="mt-0.5 text-caption text-ink-muted">{desc}</p>
      </div>
    </Link>
  ));
}

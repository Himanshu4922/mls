import Link from "next/link";
import { Eyebrow } from "@/components/ui/Badge";
import { Section } from "@/components/ui/Section";
import { getMarketSnapshot } from "@/lib/api/home";
import { snapshotStats, type SnapshotStat } from "@/lib/api/homeMappers";
import {
  gtaMarketSnapshot,
  marketReportCities,
  soldDataTeaser,
} from "@/lib/home/staticSections";
import {
  formatDate,
  formatNumber,
  formatPriceCompact,
} from "@/lib/utils/format";
import { buildListingHref } from "@/lib/utils/searchParams";
import { ArrowGlyph } from "./sectionIcons";

/**
 * "Market Intelligence, Made Useful." — HomeAtlasUI HomePage L753-831.
 *
 * The snapshot and sold teaser are LIVE from `/api/home/market-snapshot/`
 * (GTA residential sales over a rolling 30 days vs the 30 before, refreshed
 * by a backend job) with an "As of" line. If that feed is down or empty, the
 * reference's sample figures render instead. The
 * report links open the live /market-trends page for that city; the
 * reference labelled them "<City> Q3 2024 Report", but the destination shows
 * current data, not a dated report, so the period is dropped from the label.
 */
export async function MarketIntelligence() {
  const snapshot = await getMarketSnapshot();
  const liveStats = snapshot ? snapshotStats(snapshot) : [];
  const live = snapshot !== null && liveStats.length > 0;
  const stats: SnapshotStat[] = live ? liveStats : gtaMarketSnapshot;
  const teaser =
    live && snapshot
      ? [
          {
            label: `Last ${snapshot.windowDays} days`,
            value: `${formatNumber(snapshot.unitsSold)} homes`,
          },
          {
            label: "Median sold price",
            value: formatPriceCompact(snapshot.medianSoldPrice),
          },
          ...(snapshot.overAskingShare !== null
            ? [
                {
                  label: "Over asking",
                  value: `${Math.round(snapshot.overAskingShare * 100)}% of homes`,
                  highlight: true,
                },
              ]
            : []),
        ]
      : soldDataTeaser;

  return (
    <Section tone="alt">
      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
        <div>
          <Eyebrow>Know before you move</Eyebrow>
          <h2 className="mt-2 text-display text-ink">
            Market Intelligence,
            <br />
            Made Useful.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-surface bg-surface p-5 shadow-card sm:col-span-2">
            <h3 className="mb-4 text-h3 text-ink">GTA Market Snapshot</h3>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-control bg-surface-alt p-3"
                >
                  <dt className="mb-1 text-caption text-ink-muted">
                    {stat.label}
                  </dt>
                  <dd className="text-h3 text-ink">{stat.value}</dd>
                  {stat.change && (
                    <dd
                      className={`mt-0.5 text-caption font-medium ${stat.up ? "text-gold-deep" : "text-navy"}`}
                    >
                      {stat.change}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
            <p className="mt-3 text-caption text-ink-subtle">
              {live && snapshot
                ? `GTA residential sales · As of ${formatDate(snapshot.asOf)}${snapshot.stale ? " (updating)" : ""}`
                : "Sample figures for illustration"}
            </p>
          </div>

          <div className="rounded-surface bg-surface p-5 shadow-card">
            <h3 className="mb-3 text-h3 text-ink">Local Market Reports</h3>
            <ul className="space-y-2.5">
              {marketReportCities.map((city) => (
                <li key={city}>
                  <Link
                    href={`/market-trends?city=${encodeURIComponent(city)}`}
                    className="group flex w-full items-center justify-between text-small text-ink transition-colors hover:text-gold-deep"
                  >
                    <span>{city} Market Report</span>
                    <ArrowGlyph className="text-ink-muted group-hover:text-gold-deep" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-surface bg-ink p-5 text-white">
            <Eyebrow className="mb-2">Sold data</Eyebrow>
            <h3 className="mb-3 text-h3 text-white">Past Sales in Your Area</h3>
            <dl className="mb-4 space-y-2">
              {teaser.map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between text-caption"
                >
                  <dt className="text-white/60">{row.label}</dt>
                  <dd
                    className={
                      row.highlight ? "font-medium text-gold" : "font-medium"
                    }
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
            <Link
              href={buildListingHref({ status: "Sold" })}
              className="inline-flex items-center gap-1 text-small font-medium text-gold transition-all hover:gap-2"
            >
              Browse Sold Properties →
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}

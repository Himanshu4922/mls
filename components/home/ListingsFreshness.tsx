import { getListingSyncStatus } from "@/lib/api/market";
import { formatNumber, formatTorontoDateTime } from "@/lib/utils/format";

const LINE_CLASS = "mt-6 flex items-center gap-2 text-small text-white/75";

/**
 * The hero's "data updated" line (scope #3, HouseSigma's "Sold data updated
 * on" bar). States the real time of the last MLS® listing sync and how many
 * listings are active now. The timestamp is the DDF listing sync: sold data is
 * fetched live and has no sync time, so this never claims to date sold data.
 */
export async function ListingsFreshness() {
  const status = await getListingSyncStatus();
  if (!status) return <ListingsFreshnessFallback />;

  const count = status.activeListingCount && status.activeListingCount > 0 ? status.activeListingCount : null;
  return (
    <p className={LINE_CLASS}>
      <LiveDot />
      <span>
        {count ? `${formatNumber(count)} live MLS® listings` : "Live MLS® listings"} · updated{" "}
        <time dateTime={status.lastSuccessfulAt}>{formatTorontoDateTime(status.lastSuccessfulAt)}</time>
      </span>
    </p>
  );
}

/**
 * Suspense fallback and no-sync-on-record state. Deliberately claims no
 * cadence ("updated daily"): without a sync time that would be unverified.
 */
export function ListingsFreshnessFallback() {
  return (
    <p className={LINE_CLASS}>
      <LiveDot />
      <span>Live MLS® listings across the Greater Toronto Area</span>
    </p>
  );
}

function LiveDot() {
  return <span className="size-2 shrink-0 rounded-full bg-gold" aria-hidden="true" />;
}

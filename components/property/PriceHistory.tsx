import { statusLabel, normalizeStatus } from "@/lib/api/mappers";
import type { PriceSnapshot } from "@/lib/api/neighbourhood";
import { EMPTY, formatDate, formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * Buy/Sell history table from HomeAtlasUI, filled with recorded snapshots.
 * Snapshots start when this catalogue began tracking the listing.
 */
export function PriceHistory({
  snapshots,
  listingId,
}: {
  snapshots: PriceSnapshot[];
  listingId: string;
}) {
  const ordered = [...snapshots].sort((a, b) =>
    (a.recordedAt ?? "") < (b.recordedAt ?? "") ? -1 : 1,
  );
  const newestFirst = [...ordered].reverse();
  const changes = ordered.filter((row, index) => {
    const previous = ordered[index - 1];
    return previous?.listPrice != null && row.listPrice != null && row.listPrice !== previous.listPrice;
  });

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="border-b border-line bg-surface-alt px-4 py-4 sm:px-6">
          <h2 className="text-[18px] font-semibold text-ink">Buy/Sell History</h2>
        </div>
        {newestFirst.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-ink-muted sm:px-6">
            No recorded history for this listing yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead className="border-b border-line bg-surface-alt/60">
                <tr>
                  {["Date Start", "Date End", "Price", "Event", "Listing ID"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left font-medium text-ink-muted sm:px-6">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {newestFirst.map((row, index) => {
                  const newer = newestFirst[index - 1];
                  const end =
                    index === 0
                      ? row.status
                        ? statusLabel(normalizeStatus(row.status))
                        : "Active"
                      : formatDate(newer?.recordedAt ?? null);
                  return (
                    <tr key={`${row.recordedAt}-${index}`} className="border-b border-line-soft">
                      <td className="px-4 py-4 sm:px-6">{formatDate(row.recordedAt)}</td>
                      <td className="px-4 py-4 text-ink-muted sm:px-6">{end}</td>
                      <td className="px-4 py-4 font-semibold text-navy sm:px-6">
                        {formatPrice(row.listPrice)}
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <EventBadge status={row.status} />
                      </td>
                      <td className="px-4 py-4 text-ink-muted sm:px-6">{listingId || EMPTY}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-line p-4 sm:p-6">
        <h3 className="mb-2 text-[16px] font-semibold text-ink">Price Changes ({changes.length})</h3>
        {changes.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No price changes recorded for this listing.</p>
        ) : (
          <ul className="space-y-2 text-[13px]">
            {changes.map((row) => (
              <li key={row.recordedAt} className="flex justify-between gap-3">
                <span className="text-ink-muted">{formatDate(row.recordedAt)}</span>
                <span className="font-medium text-ink">{formatPrice(row.listPrice)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EventBadge({ status }: { status: string | null }) {
  const normalized = status ? normalizeStatus(status) : "other";
  const label = status ? statusLabel(normalized) : EMPTY;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
        normalized === "sold" && "bg-red-100 text-red-600",
        normalized === "active" && "bg-green-100 text-green-700",
        normalized !== "sold" && normalized !== "active" && "bg-surface-alt text-ink-muted",
      )}
    >
      {label}
    </span>
  );
}

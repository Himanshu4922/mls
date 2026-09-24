import { UnavailableNote } from "@/components/ui/States";
import { statusLabel, normalizeStatus } from "@/lib/api/mappers";
import type { PriceSnapshot } from "@/lib/api/neighbourhood";
import { EMPTY, formatDate, formatPrice } from "@/lib/utils/format";

/**
 * Listing price and status history, from `properties/<key>/snapshots/`.
 *
 * Each row is a recorded change. Snapshots only exist from when this catalogue
 * began tracking the listing, so an empty history is normal for new listings —
 * it is not a full board-level transaction record.
 */
export function PriceHistory({ snapshots }: { snapshots: PriceSnapshot[] }) {
  if (snapshots.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="text-h2 text-ink">Price history</h2>
        <UnavailableNote className="mt-2">
          No recorded price changes for this listing yet.
        </UnavailableNote>
      </section>
    );
  }

  // Newest first, with the delta against the previous recorded price.
  const rows = [...snapshots].reverse().map((snapshot, index, all) => {
    const previous = all[index + 1];
    const delta =
      previous?.listPrice && snapshot.listPrice
        ? snapshot.listPrice - previous.listPrice
        : null;
    return { ...snapshot, delta };
  });

  return (
    <section className="mt-10">
      <h2 className="text-h2 text-ink">Price history</h2>
      <p className="mt-1 text-caption text-ink-muted">
        Changes recorded since this listing entered the HomeAtlas catalogue.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-small">
          <thead>
            <tr className="border-b border-line text-left text-ink-muted">
              <th scope="col" className="py-2 pr-4 font-medium">Date</th>
              <th scope="col" className="py-2 pr-4 font-medium">Price</th>
              <th scope="col" className="py-2 pr-4 font-medium">Change</th>
              <th scope="col" className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.recordedAt}-${index}`} className="border-b border-line-soft">
                <td className="py-2.5 pr-4 text-ink-muted">{formatDate(row.recordedAt)}</td>
                <td className="py-2.5 pr-4 font-medium text-ink">
                  {formatPrice(row.listPrice)}
                </td>
                <td className="py-2.5 pr-4">
                  {row.delta === null || row.delta === 0 ? (
                    <span className="text-ink-subtle">{EMPTY}</span>
                  ) : (
                    <span className={row.delta < 0 ? "text-positive" : "text-negative"}>
                      {row.delta < 0 ? "↓" : "↑"} {formatPrice(Math.abs(row.delta))}
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-ink-muted">
                  {row.status ? statusLabel(normalizeStatus(row.status)) : EMPTY}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

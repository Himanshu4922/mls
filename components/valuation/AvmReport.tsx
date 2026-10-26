import type { ReactNode } from "react";
import type { AvmDetails, ValuationComp, ValuationResult } from "@/lib/api/valuation";
import { cn } from "@/lib/utils/cn";
import { EMPTY, formatNumber, formatPrice } from "@/lib/utils/format";

/** How many comparables sit beside the subject, as in the sample AVM report. */
export const AVM_COMP_COLUMNS = 3;

type Column = { kind: "subject"; details: AvmDetails } | { kind: "comp"; comp: ValuationComp; details: AvmDetails };
type Row = { label: string; value: (column: Column) => ReactNode };

const dash = (value: ReactNode | null | undefined) =>
  value === null || value === undefined || value === "" ? EMPTY : value;
const yesNo = (value: boolean | null) => (value === null ? EMPTY : value ? "Y" : "N");
const num = (value: number | null, digits = 0) =>
  value === null ? null : value.toLocaleString("en-CA", { maximumFractionDigits: digits });
const pair = (a: ReactNode | null, b: ReactNode | null) =>
  a === null && b === null ? EMPTY : `${a ?? "—"}/${b ?? "—"}`;
const money = (value: number | null) => (value === null ? EMPTY : formatPrice(value));

/**
 * Comparison rows: client-requested listing fields first, then the remaining
 * AVM sample rows. Missing feed values render as a dash.
 */
const ROWS: Row[] = [
  { label: "Municipality", value: (c) => dash(c.details.city ?? (c.kind === "comp" ? c.comp.city : null)) },
  { label: "Community", value: (c) => dash(c.details.community) },
  { label: "Address", value: (c) => dash(c.details.address ?? (c.kind === "comp" ? c.comp.address : null)) },
  { label: "Level", value: (c) => dash(c.details.level) },
  { label: "Unit #", value: (c) => dash(c.details.unitNumber) },
  { label: "Locker", value: (c) => yesNo(c.details.locker) },
  {
    label: "POTL monthly fees (if applicable)",
    value: (c) => (c.details.potlMonthlyFees === null ? EMPTY : money(c.details.potlMonthlyFees)),
  },
  {
    label: "Maintenance",
    value: (c) => (c.details.maintenance === null ? EMPTY : money(c.details.maintenance)),
  },
  { label: "Included in maintenance costs", value: (c) => dash(c.details.maintenanceIncludes) },
  { label: "Property type", value: (c) => dash(c.details.propertyType) },
  { label: "Style", value: (c) => dash(c.details.propertyStyle) },
  { label: "Lot frontage", value: (c) => dash(c.details.frontageFt === null ? null : `${num(c.details.frontageFt, 2)} ft`) },
  { label: "Lot depth", value: (c) => dash(c.details.depthFt === null ? null : `${num(c.details.depthFt, 2)} ft`) },
  { label: "List price", value: (c) => money(c.details.listPrice) },
  { label: "Last sold price", value: (c) => money(c.details.lastSoldPrice) },
  { label: "Property taxes", value: (c) => money(c.details.taxAnnualAmount) },
  {
    label: "Days on market",
    value: (c) => dash(c.details.daysOnMarket === null ? null : String(c.details.daysOnMarket)),
  },
  {
    label: "Square feet above ground",
    value: (c) => dash(num(c.details.aboveGradeSqft ?? c.details.floorAreaSqft)),
  },
  { label: "Garage parking spaces", value: (c) => dash(num(c.details.garageSpaces)) },
  { label: "Total parking spaces", value: (c) => dash(num(c.details.parkingTotal)) },
  { label: "Year built", value: (c) => dash(c.details.yearBuilt === null ? null : String(c.details.yearBuilt)) },
  {
    label: "Number of bedrooms",
    value: (c) => {
      const { bedrooms, bedroomsBelowGrade } = c.details;
      if (bedrooms === null) return EMPTY;
      return bedroomsBelowGrade ? `${bedrooms} + ${bedroomsBelowGrade}` : String(bedrooms);
    },
  },
  {
    label: "Number of washrooms",
    value: (c) => pair(num(c.details.bathroomsFull), num(c.details.bathroomsHalf)),
  },
  { label: "Family room", value: (c) => yesNo(c.details.familyRoom) },
  { label: "Basement (finished/unfinished)", value: (c) => dash(c.details.basement) },
  { label: "Number of kitchens", value: (c) => dash(num(c.details.kitchens)) },
  { label: "Rental items under contract", value: (c) => dash(c.details.rentalItems) },

  // Remaining AVM sample fields not covered above.
  { label: "Roll Number", value: (c) => dash(c.details.rollNumber) },
  {
    label: "Sale Price",
    value: (c) =>
      c.kind === "subject" ? (
        "Subject"
      ) : (
        <>
          {formatPrice(c.comp.price)}
          <span className="block text-caption text-ink-subtle">
            {c.comp.source === "sold_proxy" ? "Last asking (off market)" : "List price (active)"}
          </span>
        </>
      ),
  },
  {
    label: "Sale Date (yyyy-mm-dd)",
    value: (c) =>
      c.kind === "subject" ? (
        EMPTY
      ) : (
        <>
          {dash(c.comp.eventDate)}
          {c.comp.eventDate && (
            <span className="block text-caption text-ink-subtle">
              {c.comp.source === "sold_proxy" ? "Left market" : "Listed"}
            </span>
          )}
        </>
      ),
  },
  { label: "Province", value: (c) => dash(c.details.province) },
  { label: "Postal Code", value: (c) => dash(c.details.postalCode) },
  {
    label: "Site Area (A)",
    value: (c) => {
      if (c.details.lotArea === null) return EMPTY;
      const units = c.details.lotAreaUnits ? ` ${c.details.lotAreaUnits}` : "";
      return `${num(c.details.lotArea, 2)}${units}`;
    },
  },
  { label: "Total Floor Area (sqft)", value: (c) => dash(num(c.details.floorAreaSqft)) },
  {
    label: "Total/Finished Basement Area (sqft)",
    value: (c) => {
      const total = num(c.details.basementTotalSqft);
      const finished = num(c.details.basementFinishedSqft);
      if (total === null && finished === null) return EMPTY;
      return pair(total, finished);
    },
  },
  {
    label: "Full/Partial Storeys",
    value: (c) => (c.details.storeys === null ? EMPTY : `${num(c.details.storeys)}/—`),
  },
  { label: "Structure Condition", value: (c) => dash(c.details.structureCondition) },
  { label: "No. Fireplaces", value: (c) => dash(num(c.details.fireplaces)) },
  {
    label: "Renovation Year/Type",
    value: (c) =>
      pair(
        c.details.renovationYear === null ? null : String(c.details.renovationYear),
        c.details.renovationType,
      ),
  },
  { label: "Heating Type", value: (c) => dash(c.details.heating) },
  { label: "Air Conditioning", value: (c) => yesNo(c.details.airConditioning) },
  { label: "Inground Pool", value: (c) => yesNo(c.details.pool) },
  {
    label: "Garage Type/Area",
    value: (c) => {
      const type = c.details.garageType ?? c.details.parkingFeatures;
      const area = c.details.garageArea !== null ? num(c.details.garageArea) : null;
      if (!type && area === null) return EMPTY;
      if (!type) return String(area);
      if (area === null) return type;
      return `${type}/${area}`;
    },
  },
];

/**
 * The home evaluation as an AVM report (scope #10): a details strip, then the
 * subject beside its three closest comparables, row by row. Scrolls sideways
 * on narrow screens; the first column stays pinned.
 */
export function AvmReport({ result }: { result: ValuationResult }) {
  const comps = result.comps.slice(0, AVM_COMP_COLUMNS);
  const columns: Column[] = [
    { kind: "subject", details: result.subjectDetails },
    ...comps.map((comp) => ({ kind: "comp" as const, comp, details: comp.details })),
  ];
  const anyProxy = comps.some((comp) => comp.source === "sold_proxy");

  return (
    <div className="space-y-6">
      <section className="rounded-surface border border-line bg-surface p-5 sm:p-6">
        <h3 className="text-h3 text-navy">AVM details</h3>
        <dl className="mt-4 grid gap-px overflow-hidden rounded-control border border-line bg-line text-small sm:grid-cols-2">
          <Detail label="Real Time Market Value (AVM)" value={formatPrice(result.market)} />
          <Detail label="Confidence Rating" value={<Stars count={result.confidenceStars} />} />
          <Detail label="AVM Valuation Date (yyyy-mm-dd)" value={dash(result.valuationDate)} />
          <Detail label="AVM Range" value={`${formatPrice(result.low)} – ${formatPrice(result.high)}`} />
        </dl>
      </section>

      {comps.length > 0 && (
        <section className="rounded-surface border border-line bg-surface p-5 sm:p-6">
          <h3 className="text-h3 text-navy">Comparable information</h3>
          <p className="mt-1 text-caption text-ink-muted">
            Your home beside the {comps.length} closest comparables used in this estimate
            {result.comps.length > comps.length ? ` (of ${formatNumber(result.comps.length)})` : ""}.
          </p>
          <div className="mt-4 overflow-x-auto rounded-control border border-line">
            <table className="w-full min-w-[720px] text-left text-small">
              <thead>
                <tr className="bg-surface-alt">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-surface-alt px-3 py-2.5 text-caption font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    <span className="sr-only">Feature</span>
                  </th>
                  {columns.map((column, index) => (
                    <th
                      key={index}
                      scope="col"
                      className={cn(
                        "px-3 py-2.5 text-caption font-semibold uppercase tracking-wide",
                        column.kind === "subject" ? "bg-navy text-white" : "text-ink-muted",
                      )}
                    >
                      {column.kind === "subject" ? "Your home" : `Comparable ${index}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ROWS.map((row) => (
                  <tr key={row.label}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 whitespace-nowrap bg-surface-alt px-3 py-2 align-top text-caption font-semibold text-ink"
                    >
                      {row.label}
                    </th>
                    {columns.map((column, index) => (
                      <td
                        key={index}
                        className={cn(
                          "px-3 py-2 align-top text-ink-soft",
                          column.kind === "subject" && "bg-navy/5 font-medium text-ink",
                        )}
                      >
                        {row.value(column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-caption text-ink-subtle">
            {anyProxy
              ? "“Last asking (off market)” is the final list price before a home left the market, not a confirmed sale price. "
              : ""}
            Dashes mark details the listing does not include.
          </p>
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-surface px-4 py-3">
      <dt className="font-medium text-ink">{label}</dt>
      <dd className="text-right text-ink-soft">{value}</dd>
    </div>
  );
}

function Stars({ count }: { count: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(count)));
  return (
    <span role="img" aria-label={`${filled} out of 5`} className="tracking-wider text-gold">
      {"★".repeat(filled)}
      <span className="text-line">{"★".repeat(5 - filled)}</span>
    </span>
  );
}

import type { ReactNode } from "react";
import { FloorPlanLink } from "@/components/precon/FloorPlanLink";
import { SectionCard } from "@/components/ui/SectionCard";
import type {
  DepositPlan,
  HomeCollection,
  LabelValue,
  NearbyPlace,
} from "@/lib/precon/parse";

/**
 * Structured sections of the pre-con detail page. Each returns null when its
 * data is empty, and the page builds its sub-nav from the same emptiness
 * checks, so a section never appears in the nav without content.
 *
 * Tables stay real <table>s (not grids of divs) so milestone / amount pairs
 * read correctly to screen readers and in search snippets.
 */

const TH = "px-4 py-2.5 text-left text-caption font-semibold uppercase tracking-wide text-ink-muted";
const TD = "px-4 py-3 text-small text-ink";

export function DepositSection({ plans, total }: { plans: DepositPlan[]; total: string | null }) {
  if (plans.length === 0) return null;
  return (
    <SectionCard
      id="deposit"
      title="Deposit structure"
      description={total ? `${total} total deposit` : undefined}
    >
      <div className="space-y-6">
        {plans.map((plan, index) => {
          const hasAmount = plan.installments.some((step) => step.amount);
          const hasPercent = plan.installments.some((step) => step.percentage);
          return (
            <div key={`${plan.title}-${index}`}>
              {plans.length > 1 && <h3 className="mb-2 text-small font-semibold text-ink">{plan.title}</h3>}
              <div className="overflow-x-auto rounded-control border border-line">
                <table className="w-full min-w-[20rem] border-collapse">
                  {plans.length === 1 && <caption className="sr-only">{plan.title}</caption>}
                  <thead className="bg-surface-alt">
                    <tr>
                      <th scope="col" className={TH}>Milestone</th>
                      {hasAmount && <th scope="col" className={`${TH} text-right`}>Amount</th>}
                      {hasPercent && <th scope="col" className={`${TH} text-right`}>%</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {plan.installments.map((step, row) => (
                      <tr key={row}>
                        <td className={`${TD} text-ink-soft`}>{step.milestone}</td>
                        {hasAmount && <td className={`${TD} text-right font-semibold`}>{step.amount ?? ""}</td>}
                        {hasPercent && <td className={`${TD} text-right font-semibold`}>{step.percentage ?? ""}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/** Buyer incentive cards (HomeAtlasUI HomePage L708-750). */
export function IncentivesSection({ incentives }: { incentives: string[] }) {
  if (incentives.length === 0) return null;
  return (
    <SectionCard id="incentives" title="Purchaser incentives">
      <ul className="grid gap-3 sm:grid-cols-2">
        {incentives.map((incentive) => (
          <li
            key={incentive}
            className="flex items-start gap-3 rounded-control border border-gold/40 bg-gold-soft/60 p-4"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold text-ink">
              <GiftIcon />
            </span>
            <span className="text-small font-medium text-ink">{incentive}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-caption text-ink-subtle">
        Incentives are subject to availability and builder terms.
      </p>
    </SectionCard>
  );
}

export function HomeCollectionsSection({
  collections,
  projectId,
  hasFloorPlan,
}: {
  collections: HomeCollection[];
  projectId: number;
  hasFloorPlan: boolean;
}) {
  if (collections.length === 0) return null;
  const has = (key: keyof HomeCollection) => collections.some((row) => row[key]);
  const columns: Array<[keyof HomeCollection, string]> = (
    [
      ["homeType", "Type"],
      ["bedrooms", "Beds"],
      ["bathrooms", "Baths"],
      ["area", "Interior"],
      ["startingPrice", "From"],
    ] as Array<[keyof HomeCollection, string]>
  ).filter(([key]) => has(key));

  return (
    <SectionCard id="collections" title="Home collections" bodyClassName="p-0 sm:p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse">
          <thead className="bg-surface-alt">
            <tr>
              <th scope="col" className={TH}>Model</th>
              {columns.map(([key, label]) => (
                <th key={key} scope="col" className={TH}>{label}</th>
              ))}
              {hasFloorPlan && <th scope="col" className={`${TH} text-right`}><span className="sr-only">Floor plan</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {collections.map((row, index) => (
              <tr key={`${row.name}-${index}`}>
                <th scope="row" className={`${TD} text-left font-semibold`}>{row.name}</th>
                {columns.map(([key]) => (
                  <td key={key} className={`${TD} ${key === "startingPrice" ? "font-semibold" : "text-ink-soft"}`}>
                    {row[key] ?? ""}
                  </td>
                ))}
                {hasFloorPlan && (
                  <td className={`${TD} text-right`}>
                    {/* One floor-plan document per project today, so every
                        row opens the same (gated) file. */}
                    <FloorPlanLink projectId={projectId} label={`Floor plan for ${row.name}`} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function CheckList({ items, columns = 2 }: { items: string[]; columns?: 1 | 2 }) {
  return (
    <ul className={columns === 2 ? "grid gap-x-6 gap-y-2.5 sm:grid-cols-2" : "space-y-2.5"}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-small text-ink-soft">
          <CheckIcon />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function AmenitiesSection({
  amenities,
  highlights,
}: {
  amenities: string[];
  highlights: string[];
}) {
  if (amenities.length === 0 && highlights.length === 0) return null;
  return (
    <SectionCard id="amenities" title="Amenities and community">
      <div className="space-y-6">
        {amenities.length > 0 && <CheckList items={amenities} />}
        {highlights.length > 0 && (
          <div>
            {amenities.length > 0 && <h3 className="mb-3 text-small font-semibold text-ink">Community highlights</h3>}
            <CheckList items={highlights} />
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export function FeaturesSection({ interior, exterior }: { interior: string[]; exterior: string[] }) {
  if (interior.length === 0 && exterior.length === 0) return null;
  return (
    <SectionCard id="features" title="Features and finishes">
      <div className="grid gap-8 lg:grid-cols-2">
        {interior.length > 0 && (
          <div>
            <h3 className="mb-3 text-small font-semibold text-ink">Interior</h3>
            <CheckList items={interior} columns={1} />
          </div>
        )}
        {exterior.length > 0 && (
          <div>
            <h3 className="mb-3 text-small font-semibold text-ink">Exterior</h3>
            <CheckList items={exterior} columns={1} />
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export function NearbySection({ places }: { places: NearbyPlace[] }) {
  if (places.length === 0) return null;
  const hasCategory = places.some((place) => place.category);
  const hasTime = places.some((place) => place.travelTime);
  return (
    <SectionCard id="nearby" title="Nearby places" bodyClassName="p-0 sm:p-0">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-surface-alt">
            <tr>
              <th scope="col" className={TH}>Destination</th>
              {hasCategory && <th scope="col" className={TH}>Category</th>}
              {hasTime && <th scope="col" className={`${TH} text-right`}>Travel time</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {places.map((place, index) => (
              <tr key={`${place.name}-${index}`}>
                <td className={`${TD} font-medium`}>{place.name}</td>
                {hasCategory && <td className={`${TD} text-ink-muted`}>{place.category ?? ""}</td>}
                {hasTime && <td className={`${TD} text-right font-semibold text-navy`}>{place.travelTime ?? ""}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function BuyerInfoSection({ info, notes }: { info: LabelValue[]; notes: string[] }) {
  if (info.length === 0 && notes.length === 0) return null;
  return (
    <SectionCard id="buyer" title="Buyer information">
      <div className="space-y-5">
        {info.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {info.map((item) => (
              <div key={item.label} className="rounded-control bg-surface-alt p-4">
                <dt className="text-caption text-ink-muted">{item.label}</dt>
                <dd className="mt-1 text-small font-semibold text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {notes.length > 0 && (
          <Callout title="Important purchase notes">
            <CheckList items={notes} columns={1} />
          </Callout>
        )}
      </div>
    </SectionCard>
  );
}

function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-control border border-gold/40 bg-gold-soft/50 p-4">
      <h3 className="mb-3 text-small font-semibold text-ink">{title}</h3>
      {children}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-gold">
      <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7m0 0H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7Zm0 0h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

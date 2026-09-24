"use client";

import { useMemo, useState } from "react";
import { Field, NumericInput } from "@/components/ui/Field";
import { formatPrice } from "@/lib/utils/format";

/**
 * Mortgage payment estimator.
 *
 * Entirely client-side arithmetic — no backend involved, which is why it works
 * even though mls-v2 has no mortgage endpoint. Defaults reflect typical Canadian
 * terms (20% down, 25-year amortization, monthly compounding).
 *
 * Note: Canadian fixed mortgages compound semi-annually by law, so we convert
 * the nominal annual rate accordingly rather than dividing by 12 — dividing
 * would understate the payment.
 */
const DEFAULT_RATE = 4.79;
const DEFAULT_YEARS = 25;

export function MortgageCalculator({ price }: { price: number | null }) {
  const [homePrice, setHomePrice] = useState(price ?? 0);
  const [downPct, setDownPct] = useState(20);
  // Held as a string: a numeric state cannot represent the intermediate
  // "5." a user types on the way to "5.25".
  const [rateText, setRateText] = useState(String(DEFAULT_RATE));
  const rate = Number(rateText) || 0;
  const [years, setYears] = useState(DEFAULT_YEARS);

  const { monthly, principal, totalInterest } = useMemo(() => {
    const loan = Math.max(0, homePrice * (1 - downPct / 100));
    const n = Math.max(1, years * 12);

    if (loan <= 0) return { monthly: 0, principal: 0, totalInterest: 0 };
    if (rate <= 0) return { monthly: loan / n, principal: loan, totalInterest: 0 };

    // Semi-annual compounding → effective monthly rate.
    const semiAnnual = rate / 100 / 2;
    const monthlyRate = Math.pow(1 + semiAnnual, 2 / 12) - 1;

    const payment =
      (loan * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));

    return {
      monthly: payment,
      principal: loan,
      totalInterest: payment * n - loan,
    };
  }, [homePrice, downPct, rate, years]);

  return (
    <section className="mt-10 rounded-surface border border-line bg-surface-alt p-6">
      <h2 className="text-h2 text-ink">Mortgage calculator</h2>
      <p className="mt-1 text-caption text-ink-muted">
        An estimate only — not a rate quote or a pre-approval.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Home price" htmlFor="mc-price">
          <NumericInput
            id="mc-price"
            min={0}
            max={100000000}
            value={homePrice || ""}
            onChange={(event) => setHomePrice(Number(event.target.value) || 0)}
          />
        </Field>

        <Field label="Down payment (%)" htmlFor="mc-down">
          <NumericInput
            id="mc-down"
            min={0}
            max={100}
            value={downPct}
            onChange={(event) =>
              setDownPct(Math.min(100, Math.max(0, Number(event.target.value) || 0)))
            }
          />
        </Field>

        <Field label="Interest rate (%)" htmlFor="mc-rate">
          <NumericInput
            id="mc-rate"
            decimals={2}
            min={0}
            max={25}
            value={rateText}
            onChange={(event) => setRateText(event.target.value)}
          />
        </Field>

        <Field label="Amortization (years)" htmlFor="mc-years">
          <NumericInput
            id="mc-years"
            min={1}
            max={30}
            value={years}
            onChange={(event) =>
              setYears(Math.min(30, Math.max(1, Number(event.target.value) || 1)))
            }
          />
        </Field>
      </div>

      <dl className="mt-6 grid gap-px overflow-hidden rounded-control border border-line bg-line sm:grid-cols-3">
        <Stat label="Monthly payment" value={formatPrice(monthly)} emphasis />
        <Stat label="Loan amount" value={formatPrice(principal)} />
        <Stat label="Total interest" value={formatPrice(totalInterest)} />
      </dl>

      <p className="mt-3 text-caption text-ink-subtle">
        Assumes semi-annual compounding, as is standard for Canadian fixed-rate
        mortgages. Excludes property tax, insurance and CMHC premiums.
      </p>
    </section>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-surface px-4 py-4">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className={emphasis ? "mt-0.5 text-h2 text-ink" : "mt-0.5 text-h3 text-ink"}>
        {value}
      </dd>
    </div>
  );
}

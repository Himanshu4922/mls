import type { Metadata } from "next";
import { ValuationWizard } from "@/components/valuation/ValuationWizard";
import { Eyebrow } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Free home evaluation",
  description:
    "Get a data-backed estimate of your home's value, built from comparable sales in your neighbourhood.",
  alternates: { canonical: "/home-evaluation" },
};

export default function HomeEvaluationPage() {
  return (
    <>
      <section className="border-b border-line bg-surface-alt py-10 sm:py-14">
        <div className="container-page text-center">
          <Eyebrow>Home evaluation</Eyebrow>
          <h1 className="mx-auto mt-3 max-w-2xl text-display text-ink">
            What is your home worth today?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-body text-ink-muted">
            Our model compares your property against recent nearby sales and
            adjusts for size, bedrooms, parking and local price trends.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page">
          <ValuationWizard />
        </div>
      </section>
    </>
  );
}

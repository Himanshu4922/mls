import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ValuationWizard } from "@/components/valuation/ValuationWizard";
import { Eyebrow } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Sell your home",
  description:
    "List a home, rental or pre-construction assignment with HomeAtlas, or start with a free, data-backed valuation of your GTA property.",
};

/** Icons from HomeAtlasUI SellPage L886-961, recoloured to the navy token. */
const STEPS: Array<{ title: string; body: string; icon: ReactNode }> = [
  {
    title: "Details",
    body: "Tell us what you're listing — a home for sale, a rental, or a pre-construction assignment — and where it is.",
    icon: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    title: "Pricing",
    body: "Set your asking price and availability. For assignments, add the original purchase price — it stays private to our review team.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
        <path d="M14.5 9.5c-.4-.9-1.3-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.1-.6-2.5-1.5M12 6.5V8m0 8v1.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Photos",
    body: "Add photos and floor plans, then submit. Our team reviews every listing before it goes live and keeps your contact details private.",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="9" cy="10" r="1.75" stroke="currentColor" strokeWidth="1.75" />
        <path d="m21 16-5-5-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
];

export default function SellPage() {
  return (
    <>
      <section className="bg-navy py-16">
        <div className="container-page">
          <Eyebrow>Sell with HomeAtlas</Eyebrow>
          <h1 className="mt-3 max-w-2xl text-display text-white">
            Sell with data on your side.
          </h1>
          <p className="mt-3 max-w-xl text-body text-white/70">
            List your home or assignment directly, or start with an evidence-based valuation and
            work with an agent who knows your neighbourhood.
          </p>
        </div>
      </section>

      <Section eyebrow="How it works" title="List your property or assignment in 3 steps">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
          <ol className="flex flex-col gap-10">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex items-start gap-6">
                <div className="relative shrink-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold bg-gold-soft text-navy">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      {step.icon}
                    </svg>
                  </div>
                  <span
                    className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                </div>
                <div>
                  <h3 className="text-h3 text-ink">
                    <span className="sr-only">Step {index + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-1.5 max-w-md text-small leading-relaxed text-ink-muted">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="rounded-surface border border-line bg-surface-alt p-6 lg:w-80">
            <p className="text-small font-semibold text-ink">Ready when you are</p>
            <p className="mt-1 text-caption text-ink-muted">
              Save as you go and come back to your draft any time.
            </p>
            <LinkButton href="/sell/list" variant="primary" size="lg" block className="mt-5">
              List your property
            </LinkButton>
          </div>
        </div>
      </Section>

      <Section
        tone="alt"
        eyebrow="Not sure on price?"
        title="Start with your valuation"
        description="No cost, no obligation."
      >
        <ValuationWizard />
      </Section>
    </>
  );
}

import Link from "next/link";
import { Eyebrow } from "@/components/ui/Badge";
import { whatsappHref } from "@/lib/constants/contact";
import { howItWorksSteps } from "@/lib/home/contentSections";
import { WhatsAppGlyph } from "./sectionIcons";

/** "How it works" (dark) — HomeAtlasUI HomePage L1087-1129. */
export function HowItWorks() {
  return (
    <section className="bg-ink py-10 sm:py-14 lg:py-16">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <div>
          <Eyebrow>Simple &amp; fast</Eyebrow>
          <h2 className="mt-3 text-display text-white">How it works</h2>
          <p className="mt-5 text-body text-white/70">
            Finding, buying, or selling a home in the GTA has never been easier.
            HomeAtlas guides you every step of the way.
          </p>
          <a
            href={whatsappHref("Hi, I'd like some help finding, buying or selling a home in the GTA.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex h-12 items-center gap-2.5 rounded-control border border-gold px-6 text-small font-semibold text-gold transition-colors hover:bg-gold hover:text-ink"
          >
            <WhatsAppGlyph />
            Speak to us on WhatsApp
          </a>
        </div>

        <div>
          <ol className="space-y-6">
            {howItWorksSteps.map((step) => (
              <li key={step.num} className="flex gap-5">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gold text-body font-bold text-gold"
                >
                  {step.num}
                </span>
                <div>
                  <h3 className="text-h3 text-white">
                    <span className="sr-only">Step {step.num}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-1 text-small text-white/60">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="pt-8 text-caption">
            <span className="text-white/60">Know important insights about your property </span>
            <Link href="/market-trends" className="font-medium text-gold hover:underline">
              View property insights
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

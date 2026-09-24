import Image from "next/image";
import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { AlertsCta } from "@/components/home/AlertsCta";
import { HeroSearch } from "@/components/home/HeroSearch";
import { BuyersIncentives } from "@/components/home/sections/BuyersIncentives";
import { DailyNews } from "@/components/home/sections/DailyNews";
import { FeaturedListings } from "@/components/home/sections/FeaturedListings";
import { GtaMarketDeals } from "@/components/home/sections/GtaMarketDeals";
import { HighReturnProperties } from "@/components/home/sections/HighReturnProperties";
import { HowItWorks } from "@/components/home/sections/HowItWorks";
import { MarketIntelligence } from "@/components/home/sections/MarketIntelligence";
import { NeighbourAlerts } from "@/components/home/sections/NeighbourAlerts";
import { NewPrecon } from "@/components/home/sections/NewPrecon";
import { PropertyTypes } from "@/components/home/sections/PropertyTypes";
import { QuickActions } from "@/components/home/sections/QuickActions";
import { ResearchInsights } from "@/components/home/sections/ResearchInsights";
import { ResourcesGuides } from "@/components/home/sections/ResourcesGuides";
import { SoldBelowLastPurchase } from "@/components/home/sections/SoldBelowLastPurchase";
import { ThinkingOfSelling } from "@/components/home/sections/ThinkingOfSelling";
import { TodaysNewListings } from "@/components/home/sections/TodaysNewListings";
import { TopRatedSchools } from "@/components/home/sections/TopRatedSchools";
import {
  TrendingCommunities,
  TrendingCommunitiesSkeleton,
} from "@/components/home/sections/TrendingCommunities";
import { TrustedConnections } from "@/components/home/sections/TrustedConnections";
import { WhyHomeAtlas } from "@/components/home/sections/WhyHomeAtlas";
import { Eyebrow } from "@/components/ui/Badge";
import { Section } from "@/components/ui/Section";
import { PropertyGridSkeleton } from "@/components/ui/States";

/**
 * Homepage — section order follows HomeAtlasUI's HomePage.tsx, as specified
 * by the product owner:
 *
 *   hero → buy/rent/precon/sell → trending communities → featured MLS
 *   listings → property types → new precon → today's new listings → high
 *   return → GTA market deals → sold below last purchase → top-rated schools
 *   → buyer's incentives → market intelligence → neighbour alerts → smart
 *   alerts → thinking of selling → why HomeAtlas → research & insights →
 *   trusted connections → how it works → daily news → resources & guides
 *
 * Live sections fetch from mls-v2 and stream in behind Suspense, so one slow
 * endpoint never holds up the page. Sections with no backend yet render the
 * reference's sample data (lib/home/*); what each needs is tracked in
 * docs/HOMEPAGE_BACKEND_REQUIREMENTS.xlsx.
 */

export const revalidate = 600;

// Title/description come from the root layout; only the canonical is page-specific.
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return (
    <>
      <Hero />
      <QuickActions />

      <Live fallback={<TrendingCommunitiesSkeleton />}>
        <TrendingCommunities />
      </Live>
      <Live fallback={<RailFallback title="Featured MLS listings" />}>
        <FeaturedListings />
      </Live>
      <Live fallback={null}>
        <PropertyTypes />
      </Live>
      <Live fallback={<RailFallback title="New preconstruction projects" />}>
        <NewPrecon />
      </Live>
      <Live fallback={<RailFallback title="Today's new listings" />}>
        <TodaysNewListings />
      </Live>

      <Live fallback={<RailFallback title="High Return Properties" tone="dark" />}>
        <HighReturnProperties />
      </Live>
      <Live fallback={<RailFallback title="GTA Market Deals" tone="alt" />}>
        <GtaMarketDeals />
      </Live>
      <Live fallback={<RailFallback title="Sold Below Last Purchase" />}>
        <SoldBelowLastPurchase />
      </Live>
      <TopRatedSchools />
      <Live fallback={null}>
        <BuyersIncentives />
      </Live>
      <Live fallback={null}>
        <MarketIntelligence />
      </Live>
      <NeighbourAlerts />
      <AlertsCta />
      <ThinkingOfSelling />
      <WhyHomeAtlas />

      <Live fallback={null}>
        <ResearchInsights />
      </Live>

      <Live fallback={null}>
        <TrustedConnections />
      </Live>
      <HowItWorks />
      <Live fallback={null}>
        <DailyNews />
      </Live>
      <ResourcesGuides />
    </>
  );
}

/** Streams a data-backed section so the rest of the page isn't blocked on it. */
function Live({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

function RailFallback({ title, tone }: { title: string; tone?: "default" | "alt" | "dark" }) {
  return (
    <Section title={title} tone={tone}>
      <PropertyGridSkeleton count={3} />
    </Section>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-navy">
      {/* Hero photograph. `priority` because this is the LCP element on the
          homepage; the navy background shows through while it decodes. */}
      <Image
        src="/images/hero/hero-bg.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        quality={85}
        className="-z-10 object-cover object-[60%_center]"
        aria-hidden="true"
      />
      {/* Matches the reference’s rgba(21,21,21,0.55) scrim. The extra left-side
          gradient keeps the headline legible over the bright downtown skyline. */}
      <div className="absolute inset-0 -z-10 bg-ink/55" aria-hidden="true" />
      <div
        className="absolute inset-0 -z-10 bg-linear-to-r from-navy-deep/80 via-navy-deep/30 to-transparent"
        aria-hidden="true"
      />

      <div className="container-page flex items-center py-12 sm:min-h-150 sm:py-16 lg:min-h-180 lg:py-20">
        <div className="grid w-full items-center gap-10 lg:grid-cols-5 lg:gap-14">
          {/* Copy */}
          <div className="lg:col-span-2">
            <Eyebrow>GTA property intelligence</Eyebrow>
            {/* Fluid rather than stepped: the forced line breaks below mean a
                stepped size jumps the block by a whole line at each breakpoint. */}
            <h1 className="mt-4 text-[clamp(2.25rem,1.3rem+4.05vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.02em] text-white">
              Real Estate,
              <br />
              Made
              <br />
              Remarkably
              <br />
              <span className="font-normal text-gold">Smarter.</span>
            </h1>
            <p className="mt-5 max-w-md text-body text-white/80">
              Search live MLS® listings, discover pre-construction projects, compare
              communities, and make informed decisions with real market data and
              trusted local expertise.
            </p>

            {/* The reference paired three stock avatars with "Trusted by 12,000+
                GTA homeowners". Neither ships here: the photos aren't licensed and
                the headcount is a figure no backend can source — same reasoning as
                AnnouncementBar. This line states only what is verifiably true. */}
            <p className="mt-6 text-small text-white/75">
              Live MLS® data, updated daily across the Greater Toronto Area
            </p>
          </div>

          {/* Search widget */}
          <div className="lg:col-span-3 lg:flex lg:justify-end">
            <HeroSearch />
          </div>
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import { Eyebrow } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { sellingImage } from "@/lib/home/contentSections";

/**
 * "Thinking of Selling?" — HomeAtlasUI HomePage L968-997.
 *
 * "Get Free Valuation" opens the valuation tool; "Learn More" (a dead button
 * in the reference) opens the seller page.
 */
export function ThinkingOfSelling() {
  return (
    <section className="bg-surface py-10 sm:py-14 lg:py-16">
      <div className="container-page">
        <div className="grid min-h-90 overflow-hidden rounded-surface bg-ink lg:grid-cols-2">
          <div className="flex flex-col justify-center p-8 sm:p-12">
            <Eyebrow>Maximize your value</Eyebrow>
            <h2 className="mt-4 text-display text-white">Thinking of Selling?</h2>
            <p className="mt-4 max-w-md text-body text-white/70">
              Get a free home valuation in minutes. Our GTA specialists combine market
              data with local knowledge to get you the best possible price.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/home-evaluation" variant="accent" size="lg">
                Get Free Valuation
              </LinkButton>
              <LinkButton
                href="/sell"
                variant="ghost"
                size="lg"
                className="border border-white/30 text-white hover:border-white/60 hover:bg-transparent hover:text-white"
              >
                Learn More
              </LinkButton>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <Image
              src={sellingImage}
              alt="Luxury Toronto living room"
              fill
              sizes="(min-width: 1024px) 50vw, 0px"
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-ink via-transparent to-transparent"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

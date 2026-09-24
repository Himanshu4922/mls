import Image from "next/image";
import { Badge, Eyebrow, type BadgeTone } from "@/components/ui/Badge";
import { whatsappHref } from "@/lib/constants/contact";
import {
  neighbourActivity,
  neighbourAlertPoints,
  type NeighbourEvent,
} from "@/lib/home/contentSections";
import { CheckDot } from "./contentIcons";
import { NearbyActivityFeed } from "./NearbyActivityFeed";
import { NeighbourAlertForm, NeighbourPlaceProvider } from "./NeighbourAlertForm";
import { WhatsAppGlyph } from "./sectionIcons";

/**
 * "When Your Neighbours Are Selling" — HomeAtlasUI HomePage L832-902.
 *
 * The activity panel on the right shows the reference's sample cards (labelled
 * as an example, not links) until the visitor picks a place in the alert form;
 * then it switches to live new listings around that point.
 */

const EVENT_TONES: Record<NeighbourEvent, BadgeTone> = {
  "Just Listed": "navy",
  "Price Drop": "dark",
  "Open House": "warm",
  "Just Sold": "gold",
};

export function NeighbourAlerts() {
  return (
    <section className="bg-surface py-10 sm:py-14 lg:py-16">
      <NeighbourPlaceProvider>
        <div className="container-page grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>For renters &amp; neighbours</Eyebrow>
            <h2 className="mt-3 text-display text-ink">
              When Your Neighbours
              <br />
              Are Selling
            </h2>
            <p className="mt-4 text-body text-ink-muted">
              Stay informed about listings near you. Whether you&apos;re renting and your
              landlord is selling, or you&apos;re a homeowner tracking your street&apos;s
              value — HomeAtlas keeps you in the loop with instant alerts when nearby
              homes hit the market.
            </p>

            <ul className="mt-6 space-y-3">
              {neighbourAlertPoints.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckDot />
                  <span className="text-small text-ink">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 max-w-md">
              <NeighbourAlertForm />
            </div>

            <a
              href={whatsappHref("Hi, I'd like to know when homes near me are listed.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex h-12 items-center gap-2 rounded-control border border-navy px-5 text-small font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
            >
              <WhatsAppGlyph />
              Ask on WhatsApp
            </a>
          </div>

          <div>
            <NearbyActivityFeed sample={<SampleActivity />} />
          </div>
        </div>
      </NeighbourPlaceProvider>
    </section>
  );
}

/** The reference's illustrative feed, shown until a place is picked. */
function SampleActivity() {
  return (
    <>
      <ul className="grid grid-cols-2 gap-4" aria-label="Recent activity near you (sample)">
        {neighbourActivity.map((item) => (
          <li
            key={item.address}
            className="overflow-hidden rounded-control border border-line bg-surface"
          >
            <div className="relative h-24 overflow-hidden">
              <Image
                src={item.img}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover"
              />
              <Badge
                tone={EVENT_TONES[item.event]}
                className="absolute left-2 top-2 px-2 py-0.5"
              >
                {item.event}
              </Badge>
            </div>
            <div className="p-3">
              <p className="text-small font-semibold text-ink">{item.price}</p>
              <p className="truncate text-caption text-ink-muted">{item.address}</p>
              <p className="mt-0.5 text-caption text-ink-subtle">{item.daysAgo}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-caption text-ink-subtle">
        Example of the activity you&apos;ll be alerted to — pick a location to see live listings.
      </p>
    </>
  );
}

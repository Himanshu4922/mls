import Image from "next/image";
import { Badge, Eyebrow, type BadgeTone } from "@/components/ui/Badge";
import { WhatsappLink } from "@/components/providers/WhatsappProvider";
import {
  neighbourActivity,
  neighbourAlertPoints,
  type NeighbourEvent,
} from "@/lib/home/contentSections";
import { headingLines, listOf, textOf } from "@/lib/site/read";
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

export function NeighbourAlerts({ content }: { content?: Record<string, unknown> }) {
  const title = textOf(content, "title", "When Your Neighbours\nAre Selling");
  const bullets = listOf<string>(content, "bullets", neighbourAlertPoints);
  return (
    <section className="bg-surface py-10 sm:py-14 lg:py-16">
      <NeighbourPlaceProvider>
        <div className="container-page grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>{textOf(content, "eyebrow", "For renters & neighbours")}</Eyebrow>
            <h2 className="mt-3 text-display text-ink">
              {headingLines(title).map((line, index) => (
                <span key={line}>
                  {index > 0 && <br />}
                  {line}
                </span>
              ))}
            </h2>
            <p className="mt-4 text-body text-ink-muted">
              {textOf(content, "description", "Stay informed about listings near you. Whether you're renting and your landlord is selling, or you're a homeowner tracking your street's value — HomeAtlas keeps you in the loop with instant alerts when nearby homes hit the market.")}
            </p>

            <ul className="mt-6 space-y-3">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckDot />
                  <span className="text-small text-ink">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 max-w-md">
              <NeighbourAlertForm />
            </div>

            <WhatsappLink
              message={textOf(content, "whatsappMessage", "Hi, I'd like to know when homes near me are listed.")}
              className="mt-4 inline-flex h-12 items-center gap-2 rounded-control border border-navy px-5 text-small font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
            >
              <WhatsAppGlyph />
              Ask on WhatsApp
            </WhatsappLink>
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

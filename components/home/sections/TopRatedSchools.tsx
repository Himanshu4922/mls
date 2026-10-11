import { SafeImage } from "@/components/ui/SafeImage";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { topSchools } from "@/lib/home/staticSections";
import { listOf, textOf } from "@/lib/site/read";
import { buildListingHref } from "@/lib/utils/searchParams";
import { StarGlyph } from "./sectionIcons";

/**
 * "Listings by Top-Rated Schools" — HomeAtlasUI HomePage L668-707.
 *
 * Ratings and in-zone counts are the reference's sample figures. There is no
 * catchment search yet, so a card opens the school's city search.
 */
export function TopRatedSchools({ content }: { content?: Record<string, unknown> }) {
  const schools = listOf<{
    name?: string;
    school?: string;
    community?: string;
    rating?: number;
    listings?: number;
    imageUrl?: string;
    img?: string;
    imageAlt?: string;
    href?: string;
  }>(content, "items", topSchools.map((school) => ({
    name: school.school,
    community: school.community,
    rating: school.rating,
    listings: school.listings,
    imageUrl: school.img,
    href: buildListingHref({ city: school.community }),
  })));

  return (
    <Section
      tone="alt"
      eyebrow={textOf(content, "eyebrow", "Schools & families")}
      title={textOf(content, "title", "Listings by Top-Rated Schools")}
      description={textOf(content, "description", "Homes within highly rated school catchment zones")}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {schools.map((school) => (
          <Link
            key={school.name || school.school}
            href={school.href || buildListingHref({ city: school.community || "" })}
            className="group overflow-hidden rounded-surface border border-line bg-surface transition-all hover:shadow-card-hover"
          >
            <div className="relative h-[160px] overflow-hidden">
              <SafeImage
                src={school.imageUrl || school.img}
                alt={school.imageAlt || ""}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5">
                <StarGlyph className="text-gold" />
                <span className="text-small font-bold text-ink">
                  {school.rating}/10
                  <span className="sr-only"> rating</span>
                </span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="mb-0.5 text-small font-semibold text-ink">{school.name || school.school}</h3>
              <p className="mb-3 text-caption text-ink-muted">
                {school.community} · {school.listings} listings in zone
              </p>
              <span className="text-small font-medium text-navy group-hover:underline">
                Browse homes in zone →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { guides } from "@/lib/home/contentSections";
import { BookGlyph } from "./contentIcons";
import { ArrowGlyph } from "./sectionIcons";

/**
 * "Resources & Guides" — HomeAtlasUI HomePage L1190-1227.
 *
 * Guide copy is the reference's. No guide pages exist yet, so each card opens
 * the closest live page (blog, market trends, communities, sell).
 */
export function ResourcesGuides() {
  return (
    <Section
      eyebrow="Learn more"
      title="Resources & Guides"
      action={{ label: "View All", href: "/blog" }}
    >
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {guides.map((guide) => (
          <li key={guide.title}>
            <Link
              href={guide.href}
              className="group flex h-full flex-col rounded-control border border-line bg-surface p-5 transition-shadow hover:shadow-card-hover"
            >
              <div className="mb-4 flex h-25 items-center justify-center rounded-control bg-surface-alt transition-colors group-hover:bg-gold-soft">
                <BookGlyph className="text-gold" />
              </div>
              <p className="text-eyebrow uppercase text-gold">{guide.tag}</p>
              <h3 className="mt-2 text-body font-semibold text-ink">{guide.title}</h3>
              <p className="mt-2 text-small text-ink-muted">{guide.desc}</p>
              <span className="mt-auto flex items-center gap-1 pt-3 text-small font-medium text-ink transition-colors group-hover:text-gold">
                Read More <ArrowGlyph />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

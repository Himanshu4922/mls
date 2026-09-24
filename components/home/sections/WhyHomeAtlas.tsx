import { Eyebrow } from "@/components/ui/Badge";
import { advantages } from "@/lib/home/contentSections";
import { AdvantageGlyph } from "./contentIcons";

/** "Why Choose HomeAtlas" — HomeAtlasUI HomePage L998-1021. */
export function WhyHomeAtlas() {
  return (
    <section className="border-t border-line bg-surface-alt py-10 sm:py-14 lg:py-16">
      <div className="container-page">
        <div className="mb-10 text-center sm:mb-12">
          <Eyebrow>Our advantage</Eyebrow>
          <h2 className="mt-3 text-display text-ink">Why Choose HomeAtlas</h2>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {advantages.map((item) => (
            <li key={item.title} className="rounded-control bg-surface p-6 shadow-card">
              <AdvantageGlyph icon={item.icon} className="text-gold" />
              <h3 className="mt-4 text-h3 text-ink">{item.title}</h3>
              <p className="mt-2 text-small text-ink-muted">{item.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

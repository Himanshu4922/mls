import { Eyebrow } from "@/components/ui/Badge";
import { advantages, type AdvantageIcon } from "@/lib/home/contentSections";
import { listOf, textOf } from "@/lib/site/read";
import { AdvantageGlyph } from "./contentIcons";

/** "Why Choose HomeAtlas" — HomeAtlasUI HomePage L998-1021. */
export function WhyHomeAtlas({ content }: { content?: Record<string, unknown> }) {
  const items = listOf<{ title: string; description?: string; desc?: string; icon: AdvantageIcon }>(
    content,
    "items",
    advantages.map((item) => ({ title: item.title, description: item.desc, icon: item.icon })),
  );
  return (
    <section className="border-t border-line bg-surface-alt py-10 sm:py-14 lg:py-16">
      <div className="container-page">
        <div className="mb-10 text-center sm:mb-12">
          <Eyebrow>{textOf(content, "eyebrow", "Our advantage")}</Eyebrow>
          <h2 className="mt-3 text-display text-ink">{textOf(content, "title", "Why Choose HomeAtlas")}</h2>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.title} className="rounded-control bg-surface p-6 shadow-card">
              <AdvantageGlyph icon={item.icon} className="text-gold" />
              <h3 className="mt-4 text-h3 text-ink">{item.title}</h3>
              <p className="mt-2 text-small text-ink-muted">{item.description || item.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

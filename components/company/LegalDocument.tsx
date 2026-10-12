import Link from "next/link";
import { Eyebrow } from "@/components/ui/Badge";
import type { LegalSection } from "@/lib/content/company";

const RELATED = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
  { label: "Contact", href: "/contact" },
];

export function LegalDocument({
  title,
  updated,
  intro,
  sections,
  current,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
  current: string;
}) {
  return (
    <>
      <section className="bg-navy py-16">
        <div className="container-page">
          <Eyebrow>Legal</Eyebrow>
          <h1 className="mt-3 text-display text-white">{title}</h1>
          <p className="mt-3 text-small text-white/60">Last updated: {updated}</p>
        </div>
      </section>
      <article className="container-page max-w-3xl py-12">
        <p className="text-body text-ink-muted">{intro}</p>
        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-h3 text-ink">{section.title}</h2>
              {section.aside && <p className="mt-1 text-caption text-ink-muted">{section.aside}</p>}
              <p className="mt-2 text-small leading-relaxed text-ink-muted">{section.body}</p>
            </section>
          ))}
        </div>
        <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-6 text-small" aria-label="Related pages">
          {RELATED.filter((link) => link.href !== current).map((link) => (
            <Link key={link.href} href={link.href} className="text-navy hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </article>
    </>
  );
}

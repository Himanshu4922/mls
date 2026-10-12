import type { Metadata } from "next";
import Image from "next/image";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Badge";
import { ABOUT } from "@/lib/content/company";

export const metadata: Metadata = {
  title: "About HomeAtlas",
  description: ABOUT.description,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-navy py-16">
        <div className="container-page">
          <Eyebrow>{ABOUT.eyebrow}</Eyebrow>
          <h1 className="mt-3 max-w-3xl text-display text-white">{ABOUT.title}</h1>
          <p className="mt-4 max-w-2xl text-body text-white/70">{ABOUT.description}</p>
          <ul className="mt-10 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
            {ABOUT.stats.map((stat) => (
              <li key={stat.label}>
                <p className="text-h2 text-white">{stat.value}</p>
                <p className="mt-1 text-caption text-white/50">{stat.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-14">
        <Eyebrow>{ABOUT.values.eyebrow}</Eyebrow>
        <h2 className="mt-3 text-h1 text-ink">{ABOUT.values.title}</h2>
        <p className="mt-3 max-w-2xl text-body text-ink-muted">{ABOUT.values.description}</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {ABOUT.values.items.map((item) => (
            <li key={item.title} className="rounded-surface border border-line bg-surface p-5">
              <h3 className="text-h3 text-ink">{item.title}</h3>
              <p className="mt-2 text-small leading-relaxed text-ink-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-surface-alt py-14">
        <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <Eyebrow>{ABOUT.story.eyebrow}</Eyebrow>
            <h2 className="mt-3 text-h1 text-ink">{ABOUT.story.title}</h2>
            <p className="mt-4 text-body leading-relaxed text-ink-muted">{ABOUT.story.body}</p>
            <blockquote className="mt-6 border-l-2 border-gold pl-4 text-body text-ink">
              {ABOUT.story.quote}
            </blockquote>
            <div className="mt-8">
              <LinkButton href="/contact" variant="primary">
                Contact us
              </LinkButton>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <article className="rounded-surface border border-line bg-surface p-5">
              <h3 className="text-h3 text-ink">{ABOUT.story.mission.title}</h3>
              <p className="mt-2 text-small text-ink-muted">{ABOUT.story.mission.body}</p>
            </article>
            <article className="rounded-surface border border-line bg-surface p-5">
              <h3 className="text-h3 text-ink">{ABOUT.story.vision.title}</h3>
              <p className="mt-2 text-small text-ink-muted">{ABOUT.story.vision.body}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <Eyebrow>{ABOUT.awards.eyebrow}</Eyebrow>
        <h2 className="mt-3 text-h1 text-ink">{ABOUT.awards.title}</h2>
        <p className="mt-3 max-w-2xl text-body text-ink-muted">{ABOUT.awards.description}</p>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {ABOUT.awards.items.map((award) => (
            <li key={`${award.year}-${award.title}`} className="rounded-surface border border-line p-5">
              <p className="text-caption text-gold-deep">{award.year}</p>
              <h3 className="mt-1 text-h3 text-ink">{award.title}</h3>
              <p className="mt-1 text-small text-ink">{award.by}</p>
              <p className="mt-2 text-small text-ink-muted">{award.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-surface-alt py-14">
        <div className="container-page">
          <Eyebrow>{ABOUT.team.eyebrow}</Eyebrow>
          <h2 className="mt-3 text-h1 text-ink">{ABOUT.team.title}</h2>
          <p className="mt-3 max-w-2xl text-body text-ink-muted">{ABOUT.team.description}</p>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:max-w-3xl">
            {ABOUT.team.people.map((person) => (
              <li key={person.name} className="overflow-hidden rounded-surface border border-line bg-surface">
                <div className="relative aspect-[4/5]">
                  <Image src={person.image} alt={person.name} fill className="object-cover object-top" sizes="(min-width: 1024px) 360px, 50vw" />
                </div>
                <div className="p-5">
                  <h3 className="text-h3 text-ink">{person.name}</h3>
                  <p className="mt-1 text-small text-ink-muted">{person.role}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-xl text-small text-ink-muted">
            {ABOUT.person}, {ABOUT.role}. {ABOUT.award}, {ABOUT.awardYear}. {ABOUT.quote}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {ABOUT.badges.map((badge) => (
              <li key={badge} className="rounded-full border border-line bg-surface px-3 py-1 text-caption text-ink-muted">
                {badge}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

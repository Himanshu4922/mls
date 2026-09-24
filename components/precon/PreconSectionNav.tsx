"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { Tabs } from "@/components/ui/Tabs";

/**
 * Sticky in-page nav for the pre-con detail page.
 *
 * Anchor links, not tab panels: every section stays in the server HTML so it
 * is crawlable, and the nav only scrolls. The active item follows the section
 * nearest the top of the viewport.
 */
export function PreconSectionNav({
  sections,
}: {
  sections: Array<{ id: string; label: string }>;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const nodes = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // A band just below the navbar + this nav: a section is "current" once
      // its heading has scrolled up into it.
      { rootMargin: "-140px 0px -55% 0px" },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length < 2) return null;

  /*
   * Tabs' link mode passes `scroll={false}` to next/link (right for URL-driven
   * tabs), which also suppresses the jump to a hash. Handle the scroll here;
   * SectionCard's scroll-margin keeps the heading clear of the sticky bars.
   */
  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    const id = link?.getAttribute("href")?.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
    setActive(id!);
  }

  return (
    <div
      onClickCapture={onClickCapture}
      className="sticky top-[72px] z-20 -mx-4 bg-surface/95 px-4 pt-3 backdrop-blur sm:mx-0 sm:px-0 lg:top-20">
      <Tabs
        variant="underline"
        label="Project sections"
        items={sections}
        value={active}
        hrefFor={(id) => `#${id}`}
      />
    </div>
  );
}

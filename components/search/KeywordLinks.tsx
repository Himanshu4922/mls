import Link from "next/link";
import { curatedGroups, curatedPath } from "@/lib/seo/curatedPages";
import { cn } from "@/lib/utils/cn";

/**
 * "Search by keywords" (scope #24, Zoocasa-style): grouped links to the
 * curated pages. Server-rendered plain links, so crawlers follow them.
 */
export function KeywordLinks({
  includeCities = false,
  currentSlug,
  className,
}: {
  includeCities?: boolean;
  /** Omitted from the list, e.g. the page it is shown on. */
  currentSlug?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {curatedGroups({ includeCities }).map(({ group, pages }) => (
        <div key={group} className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-4">
          <h3 className="w-24 shrink-0 text-caption font-semibold uppercase tracking-wide text-ink-muted">{group}</h3>
          <ul className="flex flex-wrap gap-2">
            {pages
              .filter((page) => page.slug !== currentSlug)
              .map((page) => (
                <li key={page.slug}>
                  <Link
                    href={curatedPath(page)}
                    className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-caption text-ink-soft transition-colors hover:border-navy hover:text-navy"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

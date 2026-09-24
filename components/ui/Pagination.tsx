import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/**
 * Page navigation rendered as real links so pages are crawlable and
 * openable in a new tab.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav aria-label="Listing pages" className="flex items-center justify-center gap-1.5">
      <PageLink
        href={buildHref(page - 1)}
        disabled={page <= 1}
        label="Previous page"
        className="px-3"
      >
        ←
      </PageLink>

      {pages.map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="px-2 text-caption text-ink-subtle" aria-hidden="true">
            …
          </span>
        ) : (
          <PageLink
            key={entry}
            href={buildHref(entry)}
            current={entry === page}
            label={`Page ${entry}`}
          >
            {entry}
          </PageLink>
        ),
      )}

      <PageLink
        href={buildHref(page + 1)}
        disabled={page >= totalPages}
        label="Next page"
        className="px-3"
      >
        →
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  label,
  current,
  disabled,
  className,
}: {
  href: string;
  children: React.ReactNode;
  label: string;
  current?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const base = cn(
    "inline-flex h-10 min-w-10 items-center justify-center rounded-control border px-2 text-small font-medium transition-colors",
    className,
  );

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(base, "cursor-not-allowed border-line text-ink-subtle opacity-50")}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={cn(
        base,
        current
          ? "border-navy bg-navy text-white"
          : "border-line text-ink hover:border-navy",
      )}
    >
      {children}
    </Link>
  );
}

/** Compact page list: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page: number, total: number): Array<number | "gap"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const out: Array<number | "gap"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);

  if (start > 2) out.push("gap");
  for (let i = start; i <= end; i += 1) out.push(i);
  if (end < total - 1) out.push("gap");
  out.push(total);

  return out;
}

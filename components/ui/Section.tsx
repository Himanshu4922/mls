import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Eyebrow } from "@/components/ui/Badge";

/**
 * Standard section shell: eyebrow, heading, optional "view all" link.
 * Gives every page the same vertical rhythm — the reference re-implemented this
 * layout per page with slightly different spacing each time.
 */
export function Section({
  eyebrow,
  title,
  description,
  action,
  tone = "default",
  className,
  children,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: { label: string; href: string };
  tone?: "default" | "alt" | "dark";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    default: "bg-surface",
    alt: "bg-surface-alt",
    dark: "bg-ink text-white",
  };

  // Vertical rhythm tracks the type scale: with headings ~25% smaller on
  // phones, desktop section padding leaves the page feeling sparse.
  return (
    <section className={cn("py-10 sm:py-14 lg:py-16", tones[tone], className)}>
      <div className="container-page">
        {(eyebrow || title || action) && (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
            <div>
              {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
              {title && (
                <h2
                  className={cn(
                    "mt-2 text-h1",
                    tone === "dark" ? "text-white" : "text-ink",
                  )}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  className={cn(
                    "mt-2 max-w-2xl text-small",
                    tone === "dark" ? "text-white/60" : "text-ink-muted",
                  )}
                >
                  {description}
                </p>
              )}
            </div>
            {action && (
              <Link
                href={action.href}
                className={cn(
                  "text-small font-semibold transition-colors hover:text-gold",
                  tone === "dark" ? "text-white/70" : "text-navy",
                )}
              >
                {action.label} →
              </Link>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

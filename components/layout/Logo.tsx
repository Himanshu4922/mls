import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** HomeAtlas wordmark. `tone` switches it for the dark footer. */
export function Logo({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn("flex flex-col items-start", className)}
      aria-label="HomeAtlas — home"
    >
      <span className="flex items-center gap-1.5">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect
            width="28"
            height="28"
            rx="7"
            fill={tone === "light" ? "var(--color-navy)" : "var(--color-gold)"}
          />
          <path
            d="M7 20V12L14 7L21 12V20"
            stroke={tone === "light" ? "var(--color-gold)" : "var(--color-ink)"}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11 20V16H17V20"
            stroke={tone === "light" ? "var(--color-gold)" : "var(--color-ink)"}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="14"
            cy="11.5"
            r="1.5"
            fill={tone === "light" ? "var(--color-gold)" : "var(--color-ink)"}
          />
        </svg>
        <span
          className={cn(
            "text-[1.375rem] font-semibold leading-none tracking-tight",
            tone === "light" ? "text-navy" : "text-white",
          )}
        >
          HomeAtlas
        </span>
      </span>
      <span className="mt-0.5 pl-8 text-[0.5rem] font-semibold uppercase tracking-[0.22em] text-gold">
        Real Estate Intelligence
      </span>
    </Link>
  );
}

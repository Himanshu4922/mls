import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { PropertyBadge } from "@/lib/types/domain";

export type BadgeTone =
  | "neutral"
  | "navy"
  | "gold"
  | "warm"
  | "dark"
  | "positive"
  | "negative";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface text-ink border border-line",
  navy: "bg-navy text-white",
  gold: "bg-gold text-ink",
  warm: "bg-gold-soft text-ink",
  dark: "bg-ink text-white",
  positive: "bg-positive-soft text-positive",
  negative: "bg-negative-soft text-negative",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Maps a derived property badge to its visual tone. */
const PROPERTY_BADGE_TONES: Record<PropertyBadge["tone"], BadgeTone> = {
  new: "dark",
  openHouse: "warm",
  priceDrop: "navy",
  sold: "negative",
  featured: "gold",
  exclusive: "navy",
};

export function PropertyBadgePill({
  badge,
  className,
}: {
  badge: PropertyBadge;
  className?: string;
}) {
  return (
    <Badge tone={PROPERTY_BADGE_TONES[badge.tone]} className={className}>
      {badge.label}
    </Badge>
  );
}

/** The gold tracked label used above section headings throughout the design. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-eyebrow uppercase text-gold", className)}>{children}</p>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { DealIcon, IncentiveIcon } from "@/lib/home/staticSections";

/**
 * Line icons for the deals and incentives sections. The reference used emoji
 * (🏚️ ⚖️ 💰 …), which render differently per OS and read aloud as their
 * Unicode names; these are decorative inline SVGs in the same 24px grid.
 */

function Svg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      {children}
    </svg>
  );
}

const DEAL_PATHS: Record<DealIcon, ReactNode> = {
  // House with a downward price arrow.
  distress: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9v11h6" />
      <path d="M17 13v7m-3-3 3 3 3-3" />
    </>
  ),
  detached: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9v11h14V9" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  // Scales of justice.
  powerOfSale: (
    <>
      <path d="M12 3v18M7 21h10M5 7h14" />
      <path d="m5 7-3 6a3 3 0 0 0 6 0L5 7Zm14 0-3 6a3 3 0 0 0 6 0l-3-6Z" />
    </>
  ),
  sold: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
};

const INCENTIVE_PATHS: Record<IncentiveIcon, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9v11h14V9" />
    </>
  ),
  savings: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5c-.4-.9-1.3-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.1-.6-2.5-1.5M12 6.5V8m0 8v1.5" />
    </>
  ),
  green: (
    <>
      <path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15" />
      <path d="M5 19c3-4 6-6.5 10-8.5" />
    </>
  ),
  construction: (
    <>
      <path d="M4 21V9l8-5 8 5v12" />
      <path d="M9 21v-5h6v5M4 21h16M9 11h6" />
    </>
  ),
  equity: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.2c.6-.1 1.3-.2 2-.2 2.2 0 4 1.8 4 4" />
    </>
  ),
  retirement: (
    <>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 6-7" />
      <path d="M16 7h4v4" />
    </>
  ),
};

export function DealGlyph({ icon, className }: { icon: DealIcon; className?: string }) {
  return <Svg className={className}>{DEAL_PATHS[icon]}</Svg>;
}

export function IncentiveGlyph({ icon, className }: { icon: IncentiveIcon; className?: string }) {
  return <Svg className={className}>{INCENTIVE_PATHS[icon]}</Svg>;
}

export function StarGlyph({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={cn("shrink-0", className)}>
      <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8L12 2.5Z" />
    </svg>
  );
}

export function ArrowGlyph({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true" className={cn("shrink-0", className)}>
      <path d="M3.75 9H14.25M9 3.75L14.25 9L9 14.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={cn("shrink-0 text-whatsapp", className)}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 7c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41" />
    </svg>
  );
}

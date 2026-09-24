import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { AdvantageIcon, ConnectionIcon } from "@/lib/home/contentSections";

/**
 * Line icons for the editorial homepage sections. The reference used emoji
 * (📊 🏗️ ⚖️ 🏦 📰 📖 …), which render differently per OS and are read aloud by
 * screen readers; these are decorative inline SVGs on a 24px grid.
 */

function Svg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      width="28"
      height="28"
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

const ADVANTAGE_PATHS: Record<AdvantageIcon, ReactNode> = {
  mls: <path d="M3 3v16a2 2 0 0 0 2 2h16M8 17v-5M13 17V8M18 17v-9" />,
  precon: (
    <>
      <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M3 21h18" />
      <path d="M10 7h4M10 11h4M10 15h4" />
    </>
  ),
  local: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  guidance: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
};

const CONNECTION_PATHS: Record<ConnectionIcon, ReactNode> = {
  legal: (
    <>
      <path d="M12 3v18M7 21h10M5 7h14M12 3l-1 4h2Z" />
      <path d="m5 7-3 7a3 3 0 0 0 6 0Zm14 0-3 7a3 3 0 0 0 6 0Z" />
    </>
  ),
  mortgage: (
    <>
      <path d="M3 21h18M4 10h16M12 3 3 8h18Z" />
      <path d="M6 10v8M10 10v8M14 10v8M18 10v8" />
    </>
  ),
  inspection: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-5-5" />
    </>
  ),
  planning: <path d="M3 3v16a2 2 0 0 0 2 2h16M7 15l4-4 3 3 6-6" />,
  insurance: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
  moving: (
    <>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
};

export function AdvantageGlyph({ icon, className }: { icon: AdvantageIcon; className?: string }) {
  return <Svg className={className}>{ADVANTAGE_PATHS[icon]}</Svg>;
}

export function ConnectionGlyph({ icon, className }: { icon: ConnectionIcon; className?: string }) {
  return <Svg className={className}>{CONNECTION_PATHS[icon]}</Svg>;
}

export function NewsGlyph({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8Z" />
    </Svg>
  );
}

export function BookGlyph({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2ZM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z" />
    </Svg>
  );
}

/** White tick on a filled navy disc — the reference's checklist bullet. */
export function CheckDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy",
        className,
      )}
    >
      <svg width="10" height="10" viewBox="0 0 12 10" fill="none">
        <path
          d="M1 5l3.5 3.5L11 1"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

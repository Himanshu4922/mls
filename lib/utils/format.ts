/**
 * Display formatters.
 *
 * Rule: these never invent a value. When data is absent they return the em-dash
 * placeholder so the UI reads as "not available" rather than "zero".
 */

export const EMPTY = "—";

/** DRF serializes DecimalField as a string; parse defensively. */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** "$1,289,000" */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  return `$${Math.round(value).toLocaleString("en-CA")}`;
}

/** Compact form for dense surfaces: "$1.29M", "$749K". */
export function formatPriceCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  // From $999,500 up: rounding to thousands would print "$1000K".
  if (value >= 999_500) {
    const m = Math.round(value / 10_000) / 100;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(2)}M`;
  }
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

export function formatLeasePrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  return `${formatPrice(value)}/mo`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  return value.toLocaleString("en-CA");
}

export function formatSqft(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return EMPTY;
  }
  return `${Math.round(value).toLocaleString("en-CA")} sq ft`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return d.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthLabel(value: string | null | undefined): string {
  if (!value) return EMPTY;
  // Accepts "2024-07" as well as full ISO timestamps.
  const iso = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-CA", { month: "short", year: "numeric" });
}

/** "3 days ago" — used for New badges and listing recency. */
export function daysSince(value: string | null | undefined): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

/**
 * RESO text fields pack multiple values into one comma/pipe separated string.
 * Splits into clean chips, dropping blanks and duplicates.
 */
export function splitFeatures(value: string | null | undefined): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(/[,|;]/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0 && part.toLowerCase() !== "none"),
    ),
  );
}

/** Title Case for RESO values that arrive SHOUTING or lowercase. */
export function titleCase(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * "Sep 25, 2026 at 5:10 p.m. ET" — a backend timestamp shown in Toronto time,
 * the market every listing is in, whatever the server's or reader's zone.
 */
export function formatTorontoDateTime(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  const date = d.toLocaleDateString("en-CA", {
    timeZone: "America/Toronto",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-CA", {
    timeZone: "America/Toronto",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} at ${time} ET`;
}

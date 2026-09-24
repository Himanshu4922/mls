/**
 * Canadian postal codes.
 *
 * mls-v2's `postal_code` filter strips spaces and uppercases, then treats a
 * 3-character value as an FSA prefix ("L7A" → every L7A…) and a 6-character
 * value as an exact match ("L7A3K9"). We normalise to the same compact form so
 * the URL, the pill label and the backend all agree.
 *
 * Letters D, F, I, O, Q and U never appear, and W and Z never lead — rejecting
 * those catches most typos (O vs 0, I vs 1) before a round trip.
 */

const FSA = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]$/;
const FULL = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/;

export type PostalKind = "fsa" | "full";

/** "l7a 3k9" → "L7A3K9"; returns null when it is neither an FSA nor a full code. */
export function normalizePostal(input: string): string | null {
  const compact = input.replace(/\s+/g, "").toUpperCase();
  if (FSA.test(compact) || FULL.test(compact)) return compact;
  return null;
}

export function postalKind(normalized: string): PostalKind {
  return normalized.length === 3 ? "fsa" : "full";
}

/** "L7A3K9" → "L7A 3K9" for display. */
export function formatPostal(normalized: string): string {
  return normalized.length === 6
    ? `${normalized.slice(0, 3)} ${normalized.slice(3)}`
    : normalized;
}

/**
 * Parses a comma/space separated list ("L7A, L6P 2K1") into normalised codes.
 * Returns the valid codes plus any tokens that failed, so a form can say which.
 */
export function parsePostalList(input: string): { codes: string[]; invalid: string[] } {
  const codes: string[] = [];
  const invalid: string[] = [];

  // A full code is often typed with a space ("L7A 3K9"), so split on commas
  // first and only fall back to whitespace for a token that isn't one code.
  for (const chunk of input.split(",")) {
    const token = chunk.trim();
    if (!token) continue;
    const whole = normalizePostal(token);
    if (whole) {
      if (!codes.includes(whole)) codes.push(whole);
      continue;
    }
    for (const part of token.split(/\s+/)) {
      const code = normalizePostal(part);
      if (code) {
        if (!codes.includes(code)) codes.push(code);
      } else if (part) {
        invalid.push(part);
      }
    }
  }
  return { codes, invalid };
}

/** True when a free-text search box value is really a postal code. */
export function looksLikePostal(input: string): boolean {
  const { codes, invalid } = parsePostalList(input);
  return codes.length > 0 && invalid.length === 0;
}

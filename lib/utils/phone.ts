/**
 * Phone helpers for the OTP flow.
 *
 * Twilio Verify needs E.164 (`+14165550123`) and mls-v2 passes the number
 * through untouched, so normalisation has to happen here. The backend also
 * compares the verified number to later document-intent phones by exact string,
 * which is another reason to produce one canonical form.
 */

export interface DialCountry {
  code: string;
  label: string;
  dial: string;
}

/** Short list, Canada first — this is a GTA brokerage. */
export const DIAL_COUNTRIES: DialCountry[] = [
  { code: "CA", label: "Canada", dial: "+1" },
  { code: "US", label: "United States", dial: "+1" },
  { code: "IN", label: "India", dial: "+91" },
  { code: "GB", label: "United Kingdom", dial: "+44" },
  { code: "CN", label: "China", dial: "+86" },
  { code: "PK", label: "Pakistan", dial: "+92" },
  { code: "PH", label: "Philippines", dial: "+63" },
  { code: "AE", label: "United Arab Emirates", dial: "+971" },
];

/**
 * Normalises user input to E.164, or returns null when it can't be one.
 *
 * - Input that already starts with `+` is trusted for its country code.
 * - A NANP number typed as 10 digits, or 11 starting with 1, gets `+1`.
 * - Anything else gets `dial` prepended.
 */
export function toE164(input: string, dial = "+1"): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }

  let digits = trimmed.replace(/\D/g, "");
  // A leading international prefix typed out ("00 44 …").
  if (digits.startsWith("00")) digits = digits.slice(2);

  const dialDigits = dial.replace(/\D/g, "");
  if (dialDigits === "1") {
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;
    return null;
  }

  if (digits.startsWith(dialDigits) && digits.length > dialDigits.length + 6) {
    return `+${digits}`;
  }
  // Drop a national trunk 0 ("07911 …" → "+44 7911 …").
  const national = digits.replace(/^0+/, "");
  const full = `${dialDigits}${national}`;
  return full.length >= 8 && full.length <= 15 ? `+${full}` : null;
}

/** "+14165550123" → "+1 (416) 555-0123"; other countries are grouped loosely. */
export function formatPhone(e164: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (match) return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
  return e164;
}

/** Masks all but the last four digits, for "we sent a code to …" copy. */
export function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length <= 4) return e164;
  return `•••• ${digits.slice(-4)}`;
}

/**
 * Brokerage contact points shared across the site.
 *
 * WhatsApp is a deployment setting (NEXT_PUBLIC_WHATSAPP_NUMBER, digits with
 * country code). `||`, not `??`: an empty value copied from .env.example must
 * fall back rather than hide every WhatsApp button. The fallback is the line
 * the mls-v2 frontend used.
 */
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "14168214200").replace(
  /\D/g,
  "",
);

/** wa.me link, optionally with a prefilled message and a CMS number. */
export function whatsappHref(message?: string, number?: string): string {
  const digits = (number || "").replace(/\D/g, "");
  const base = `https://wa.me/${digits.length >= 10 ? digits : WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

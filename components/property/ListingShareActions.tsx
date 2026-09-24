"use client";

import { useEffect, useState } from "react";
import { CompareButton } from "@/components/property/CompareButton";
import { WHATSAPP_NUMBER, whatsappHref } from "@/lib/constants/contact";
import { cn } from "@/lib/utils/cn";

/**
 * Compare · Share · WhatsApp row on the property page.
 *
 * HomeAtlasUI PropertyDetailPage L128-174 action row, in v3's control
 * vocabulary: every action is the same bordered `rounded-control` button, so
 * WhatsApp carries its brand green on the icon only (white on that green is
 * too low-contrast to read).
 *
 * The number comes from lib/constants/contact.ts (NEXT_PUBLIC_WHATSAPP_NUMBER).
 */

const ACTION =
  "inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-surface px-3.5 " +
  "text-caption font-medium text-ink transition-colors hover:border-navy hover:text-navy";

export function ListingShareActions({
  listingKey,
  address,
  url,
  canCompare,
  className,
}: {
  listingKey: string;
  address: string;
  /** Canonical absolute URL — shared links shouldn't carry filters or tracking params. */
  url: string;
  /** Compare is limited to active listings, matching the listing cards. */
  canCompare: boolean;
  className?: string;
}) {
  const message = `Hi, I'm interested in ${address} (MLS® ${listingKey}). ${url}`;
  const whatsappLink = whatsappHref(message);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {canCompare && <CompareButton listingKey={listingKey} address={address} variant="inline" />}
      <ShareButton title={address} url={url} />
      {WHATSAPP_NUMBER && (
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className={ACTION}>
          <WhatsAppGlyph />
          WhatsApp
          <span className="sr-only">(opens WhatsApp)</span>
        </a>
      )}
    </div>
  );
}

/**
 * Native share sheet where available (mobile, Safari), otherwise copy the
 * link. A cancelled share sheet is not an error, so it stays silent.
 */
function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!copied && !failed) return;
    const timer = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [copied, failed]);

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Share unavailable in this context (e.g. insecure origin) — copy instead.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <span className="relative inline-flex">
      <button type="button" onClick={share} className={ACTION}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        {copied ? "Link copied" : "Share"}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Link copied to clipboard" : ""}
      </span>
      {failed && (
        <span
          role="alert"
          className="absolute left-0 top-full z-10 mt-1.5 whitespace-nowrap rounded-control bg-ink px-2.5 py-1 text-caption text-white shadow-pop"
        >
          Couldn&apos;t copy — copy the address bar instead.
        </span>
      )}
    </span>
  );
}

function WhatsAppGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="text-whatsapp" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 7c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41" />
    </svg>
  );
}

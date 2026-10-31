"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { isOptimizableImage } from "@/lib/api/homeMappers";

/** Shown wherever a card has no photo, or its photo fails to load. */
export const PLACEHOLDER_IMAGE = "/images/placeholders/home.svg";

type SafeImageProps = Omit<ImageProps, "src"> & {
  /** Missing, empty or broken sources all fall back to the placeholder. */
  src: string | null | undefined;
};

/**
 * `next/image` that never renders a broken-image icon.
 *
 * Feed photos (ddfcdn.realtor.ca) often fail when run through the Next image
 * optimizer on Vercel, so MLS CDNs load `unoptimized`. If an optimized remote
 * still errors once, we retry unoptimized before falling back to the
 * placeholder. `onError` still fires for a load that failed before hydration:
 * next/image re-assigns `src` on mount when a handler is attached.
 */
export function SafeImage({ src, alt, unoptimized, onError, referrerPolicy, ...props }: SafeImageProps) {
  // Remembers WHICH source failed, so a new `src` gets its own attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  // After an optimizer failure, force a direct browser fetch before giving up.
  const [forceUnoptimized, setForceUnoptimized] = useState(false);
  const usable = src && src !== failedSrc ? src : null;
  const skipOptimize =
    Boolean(unoptimized) ||
    forceUnoptimized ||
    (usable ? !isOptimizableImage(usable) : true);
  // Remount when the URL or optimize mode changes so next/image can't keep a stale bitmap.
  const imageKey = usable ? `${usable}:${skipOptimize ? "raw" : "opt"}` : "placeholder";

  if (!usable) {
    return (
      <Image
        {...props}
        key={imageKey}
        src={PLACEHOLDER_IMAGE}
        // An SVG gains nothing from the optimiser.
        unoptimized
        alt={alt ? "No photo available" : ""}
      />
    );
  }

  return (
    <Image
      {...props}
      key={imageKey}
      src={usable}
      alt={alt}
      unoptimized={skipOptimize}
      // Some board CDNs are picky about Referer; no-referrer is safest for MLS photos.
      referrerPolicy={referrerPolicy ?? (skipOptimize ? "no-referrer" : undefined)}
      onError={(event) => {
        if (!skipOptimize && /^https?:\/\//i.test(usable)) {
          setForceUnoptimized(true);
          return;
        }
        setFailedSrc(usable);
        onError?.(event);
      }}
    />
  );
}

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
 * Feed and CMS photos go stale (the reference's Unsplash links 404) and some
 * listings have none, so every card photo goes through here. Remote hosts not
 * in next.config's `remotePatterns` are served unoptimised rather than
 * throwing. `onError` still fires for a load that failed before hydration:
 * next/image re-assigns `src` on mount when a handler is attached.
 */
export function SafeImage({ src, alt, unoptimized, onError, ...props }: SafeImageProps) {
  // Remembers WHICH source failed, so a new `src` gets its own attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const usable = src && src !== failedSrc ? src : null;

  if (!usable) {
    return (
      <Image
        {...props}
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
      src={usable}
      alt={alt}
      unoptimized={unoptimized ?? !isOptimizableImage(usable)}
      onError={(event) => {
        setFailedSrc(usable);
        onError?.(event);
      }}
    />
  );
}

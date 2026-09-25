"use client";

import { SafeImage } from "@/components/ui/SafeImage";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import type { PropertyImage } from "@/lib/types/domain";

/**
 * Photo gallery with a lightbox.
 *
 * Keyboard: arrows move between photos, Escape closes the lightbox.
 */
export function Gallery({
  images,
  address,
}: {
  images: PropertyImage[];
  address: string;
}) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const count = images.length;
  useScrollLock(lightbox);

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => (current + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(false);
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox, go]);

  if (count === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-surface border border-line bg-surface-alt text-small text-ink-muted sm:h-[420px]">
        No photos available for this listing
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="relative h-[280px] overflow-hidden rounded-surface bg-surface-alt sm:h-[420px]"
          aria-label={`View photo 1 of ${count} full screen`}
        >
          <SafeImage
            src={images[0].url}
            alt={`${address} — main photo`}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 66vw"
            className="object-cover transition-transform duration-500 hover:scale-[1.02]"
          />
        </button>

        {count > 1 && (
          // A 2×2 thumbnail block, as in HomeAtlasUI: one hero photo with four
          // supporting shots reads as a gallery, where two read as an offcut.
          <div className="hidden grid-cols-2 grid-rows-2 gap-2 sm:grid">
            {images.slice(1, 5).map((image, i) => {
              const shown = Math.min(count - 1, 4);
              const isLast = i === shown - 1;
              const remaining = count - 1 - shown;
              return (
                <button
                  key={image.url}
                  type="button"
                  onClick={() => {
                    setIndex(i + 1);
                    setLightbox(true);
                  }}
                  className="relative overflow-hidden rounded-surface bg-surface-alt"
                  aria-label={
                    isLast && remaining > 0
                      ? `View all ${count} photos full screen`
                      : `View photo ${i + 2} of ${count} full screen`
                  }
                >
                  <SafeImage
                    src={image.url}
                    alt={`${address} — photo ${i + 2}`}
                    fill
                    sizes="20vw"
                    className="object-cover transition-transform duration-500 hover:scale-[1.02]"
                  />
                  {isLast && remaining > 0 && (
                    <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-small font-semibold text-white">
                      +{remaining} more
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${index + 1} of ${count} for ${address}`}
          className="fixed inset-0 z-[250] flex flex-col bg-ink/95"
        >
          <div className="flex items-center justify-between px-5 py-4 text-white">
            <p className="text-small">
              {index + 1} / {count}
            </p>
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="rounded-full p-2 transition-colors hover:bg-white/10"
              aria-label="Close gallery"
              autoFocus
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="relative flex-1">
            <SafeImage
              src={images[index].url}
              alt={`${address} — photo ${index + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {count > 1 && (
            <div className="flex items-center justify-center gap-4 py-5">
              <GalleryNav label="Previous photo" onClick={() => go(-1)} direction="left" />
              <GalleryNav label="Next photo" onClick={() => go(1)} direction="right" />
            </div>
          )}
        </div>
      )}
    </>
  );
}

function GalleryNav({
  label,
  onClick,
  direction,
}: {
  label: string;
  onClick: () => void;
  direction: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white",
        "transition-colors hover:bg-white/10",
      )}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

"use client";

import { useEffect } from "react";

/**
 * Stops the page behind an overlay from scrolling while `active` is true.
 *
 * Ref-counted: a dialog opened from inside another dialog (or a lightbox)
 * takes a second lock, and the page unlocks only when the LAST one releases.
 * Each overlay saving/restoring `body.style.overflow` on its own gets this
 * wrong — the inner one restores "hidden"-or-"" out of order and the page
 * either stays frozen or scrolls under the outer dialog.
 *
 * Both `<html>` and `<body>` are locked: which element actually scrolls depends
 * on the page's CSS, and locking only one leaves the other scrollable. The
 * disappearing scrollbar's width is padded back so the layout doesn't jump.
 */
let locks = 0;
let saved: { html: string; body: string; padding: string } | null = null;

function lock() {
  locks += 1;
  if (locks > 1) return;

  const { documentElement: html, body } = document;
  const scrollbarWidth = window.innerWidth - html.clientWidth;
  saved = {
    html: html.style.overflow,
    body: body.style.overflow,
    padding: body.style.paddingRight,
  };
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
}

function unlock() {
  locks = Math.max(0, locks - 1);
  if (locks > 0 || !saved) return;

  const { documentElement: html, body } = document;
  html.style.overflow = saved.html;
  body.style.overflow = saved.body;
  body.style.paddingRight = saved.padding;
  saved = null;
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}

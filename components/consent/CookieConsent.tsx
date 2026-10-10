"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "homeatlas.cookie-consent";
type Choice = "accepted" | "essential";

/**
 * Loads analytics only after the visitor accepts, and only when an id is set.
 * Empty ids mean the tag is skipped — the banner still works without them.
 */
function safeTagId(value: string): string {
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : "";
}

function readChoice(): Choice | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "accepted" || stored === "essential" ? stored : null;
  } catch {
    return null;
  }
}

const GA_ID = safeTagId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "");
const META_PIXEL_ID = safeTagId(process.env.NEXT_PUBLIC_META_PIXEL_ID || "");
const GOOGLE_ADS_ID = safeTagId(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "");

function injectScript(src: string, id: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function loadTags() {
  if (GA_ID || GOOGLE_ADS_ID) {
    injectScript(
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID || GOOGLE_ADS_ID)}`,
      "ha-gtag",
    );
    const inlineId = "ha-gtag-inline";
    if (!document.getElementById(inlineId)) {
      const inline = document.createElement("script");
      inline.id = inlineId;
      const configs = [GA_ID, GOOGLE_ADS_ID].filter(Boolean).map((id) => `gtag('config','${id}');`).join("");
      inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${configs}`;
      document.head.appendChild(inline);
    }
  }
  if (META_PIXEL_ID && !document.getElementById("ha-meta-pixel")) {
    const inline = document.createElement("script");
    inline.id = "ha-meta-pixel";
    inline.text =
      `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
      `n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;` +
      `n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;` +
      `t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,` +
      `document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
      `fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`;
    document.head.appendChild(inline);
  }
}

export function CookieConsent() {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readChoice();
    setChoice(stored);
    setReady(true);
    if (stored === "accepted") loadTags();
  }, []);

  function choose(next: Choice) {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked: honour the choice for this page view only.
    }
    setChoice(next);
    if (next === "accepted") loadTags();
  }

  if (!ready || choice) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie choices"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface px-4 py-4 shadow-card sm:px-6"
    >
      <div className="container-page flex flex-col gap-3 pr-28 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-small text-ink">
          We use essential cookies to run the site. Analytics and advertising tags load only if you
          allow them.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("essential")}
            className="rounded-control border border-line px-3 py-2 text-caption font-medium text-ink hover:border-navy"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-control bg-navy px-3 py-2 text-caption font-medium text-white hover:bg-navy-deep"
          >
            Allow analytics
          </button>
        </div>
      </div>
    </div>
  );
}

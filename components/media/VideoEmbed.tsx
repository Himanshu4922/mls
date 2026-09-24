"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { getVideoEmbed } from "@/lib/utils/video";

/*
 * YouTube IFrame API over raw postMessage.
 *
 * Loading www.youtube.com/iframe_api would pull a second script and a global
 * `YT` just to learn one thing — that playback ended. The embed URL already
 * carries `enablejsapi=1`, so the player answers a "listening" handshake with
 * state events we can read directly.
 */
const YT_ORIGINS = new Set([
  "https://www.youtube-nocookie.com",
  "https://www.youtube.com",
]);
const YT_ENDED = 0;
const YT_PLAYING = 1;

/** Player state from either event shape the widget sends. */
function playerState(data: unknown): number | null {
  let parsed: unknown = data;
  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const message = parsed as { event?: string; info?: unknown };
  if (message.event === "onStateChange" && typeof message.info === "number") {
    return message.info;
  }
  if (
    message.event === "infoDelivery" &&
    message.info &&
    typeof message.info === "object" &&
    typeof (message.info as { playerState?: unknown }).playerState === "number"
  ) {
    return (message.info as { playerState: number }).playerState;
  }
  return null;
}

interface VideoEmbedProps {
  /** Any YouTube / Vimeo URL; resolved through `getVideoEmbed`. */
  url: string;
  /** Accessible name for the player and its play button. */
  title: string;
  /**
   * Extra action shown on the end-of-video cover next to "Replay" — e.g. a
   * "Contact agent" button. Optional.
   */
  endCta?: ReactNode;
  className?: string;
}

/**
 * Click-to-play video with a cover over YouTube's end screen.
 *
 * Why a facade: the iframe (and YouTube's scripts and cookies) load only when
 * the reader presses play, which keeps article pages light.
 *
 * Why the end cover: since 2018 `rel=0` no longer removes the suggestion grid
 * at the end of a video — it only limits it to the same channel. The only way
 * to keep a reader from being funnelled to other videos is to cover the player
 * the moment it reports ENDED.
 *
 * Renders nothing for a URL `getVideoEmbed` does not recognise; callers decide
 * the fallback (e.g. a native <video> for an uploaded file).
 */
export function VideoEmbed({ url, title, endCta, className }: VideoEmbedProps) {
  const embed = useMemo(() => getVideoEmbed(url), [url]);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const [thumbFailed, setThumbFailed] = useState(false);

  const isYouTube = embed?.provider === "youtube";

  /*
   * The src is fixed once, when play is pressed: autoplay so the first click
   * starts playback, and `origin` so the widget accepts our handshake. Built
   * in the click handler (not render) because `window` is client-only.
   */
  const [src, setSrc] = useState<string | null>(null);

  const post = useCallback(
    (message: Record<string, unknown>) => {
      const target = iframeRef.current?.contentWindow;
      if (!target || !embed) return;
      // Addressed to the player's own origin, never "*".
      target.postMessage(JSON.stringify(message), new URL(embed.embedUrl).origin);
    },
    [embed],
  );

  // Handshake + state listener. The widget ignores "listening" until its API
  // is up, so repeat it until the first state message arrives (the official
  // iframe_api does the same).
  useEffect(() => {
    if (!playing || !isYouTube) return;
    let heard = false;
    let tries = 0;

    const onMessage = (event: MessageEvent) => {
      if (!YT_ORIGINS.has(event.origin)) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const state = playerState(event.data);
      if (state === null) return;
      heard = true;
      if (state === YT_ENDED) setEnded(true);
      else if (state === YT_PLAYING) setEnded(false);
    };
    window.addEventListener("message", onMessage);

    const timer = window.setInterval(() => {
      if (heard || tries++ > 40) {
        window.clearInterval(timer);
        return;
      }
      post({ event: "listening", id: embed?.id, channel: "widget" });
    }, 250);

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(timer);
    };
  }, [playing, isYouTube, embed?.id, post]);

  // Keyboard users were inside the iframe when it ended; hand focus to the
  // cover so they are not stranded on a hidden player.
  useEffect(() => {
    if (ended && document.activeElement === iframeRef.current) {
      coverRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    }
  }, [ended]);

  if (!embed) return null;

  const start = () => {
    const next = new URL(embed.embedUrl);
    next.searchParams.set("autoplay", "1");
    if (isYouTube) next.searchParams.set("origin", window.location.origin);
    setSrc(next.toString());
    setPlaying(true);
  };

  const replay = () => {
    post({ event: "command", func: "seekTo", args: [embed.start ?? 0, true] });
    post({ event: "command", func: "playVideo", args: [] });
    setEnded(false);
  };

  // Vimeo shows no suggestion grid and we have no poster for it without an
  // extra oEmbed request, so it is framed directly (lazily).
  const showFacade = isYouTube && !playing;

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-surface border border-line bg-ink",
        className,
      )}
    >
      {showFacade ? (
        <button
          type="button"
          onClick={start}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 h-full w-full focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-gold"
        >
          {embed.thumbnailUrl && !thumbFailed && (
            // Plain <img>: a single small poster; not worth routing i.ytimg.com
            // through the image optimiser.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={embed.thumbnailUrl}
              alt=""
              loading="lazy"
              onError={() => setThumbFailed(true)}
              className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
            />
          )}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-navy/90 text-white shadow-pop transition-transform group-hover:scale-105 group-hover:bg-navy"
          >
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="currentColor">
              <path d="M8 5.5v13a1 1 0 0 0 1.52.85l10.4-6.5a1 1 0 0 0 0-1.7L9.52 4.65A1 1 0 0 0 8 5.5Z" />
            </svg>
          </span>
        </button>
      ) : (
        <iframe
          ref={iframeRef}
          src={src ?? embed.embedUrl}
          title={title}
          loading={isYouTube ? undefined : "lazy"}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      )}

      {ended && (
        <div
          ref={coverRef}
          role="group"
          aria-label="Video ended"
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/90 p-6 text-center text-white"
        >
          <p className="text-small text-white/80">Thanks for watching</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="secondary" onClick={replay}>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
              </svg>
              Replay
            </Button>
            {endCta}
          </div>
        </div>
      )}
    </div>
  );
}

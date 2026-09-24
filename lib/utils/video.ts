/**
 * Video embed resolution.
 *
 * One place decides which video URLs may be framed and how. Everything that
 * embeds a video — the blog post header, iframes inside sanitized post bodies,
 * listing tours — goes through `getVideoEmbed`, and an unrecognised URL returns
 * null rather than being framed as-is.
 *
 * YouTube: `youtube-nocookie.com` (no tracking cookies until play) with
 * `rel=0`. Since 2018 `rel=0` only limits end-screen suggestions to the same
 * channel rather than removing them, so `VideoEmbed` additionally covers the
 * player when playback ends. See components/media/VideoEmbed.tsx.
 */

export interface VideoEmbed {
  provider: "youtube" | "vimeo";
  id: string;
  /** Ready-to-frame URL with privacy / no-suggestion params applied. */
  embedUrl: string;
  /** Poster image for the click-to-play facade (YouTube only). */
  thumbnailUrl: string | null;
  /** Start offset in seconds, when the source URL carried one. */
  start: number | null;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

/** "1h2m3s", "90s", "90" → seconds. */
function parseStart(value: string | null): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value) || null;
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match || !match[0]) return null;
  const [, h, m, s] = match;
  const total = Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
  return total || null;
}

function youTubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be") return url.pathname.split("/")[1] ?? null;
  if (!YOUTUBE_HOSTS.has(host)) return null;

  if (url.pathname === "/watch") return url.searchParams.get("v");
  const [, kind, id] = url.pathname.split("/");
  if (kind === "embed" || kind === "shorts" || kind === "live" || kind === "v") {
    return id ?? null;
  }
  return null;
}

function vimeoId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host === "vimeo.com" || host === "www.vimeo.com") {
    return url.pathname.split("/").filter(Boolean).find((part) => VIMEO_ID.test(part)) ?? null;
  }
  if (host === "player.vimeo.com") {
    const [, kind, id] = url.pathname.split("/");
    return kind === "video" ? (id ?? null) : null;
  }
  return null;
}

export function getVideoEmbed(raw: string | null | undefined): VideoEmbed | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim().startsWith("//") ? `https:${raw.trim()}` : raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const yt = youTubeId(url);
  if (yt && YOUTUBE_ID.test(yt)) {
    const start = parseStart(url.searchParams.get("t") ?? url.searchParams.get("start"));
    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      iv_load_policy: "3",
      // Lets VideoEmbed listen for the ENDED state via postMessage.
      enablejsapi: "1",
    });
    if (start) params.set("start", String(start));
    return {
      provider: "youtube",
      id: yt,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?${params}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
      start,
    };
  }

  const vm = vimeoId(url);
  if (vm && VIMEO_ID.test(vm)) {
    return {
      provider: "vimeo",
      id: vm,
      // dnt=1: no tracking cookies. Vimeo shows no suggestion grid by default.
      embedUrl: `https://player.vimeo.com/video/${vm}?dnt=1`,
      thumbnailUrl: null,
      start: null,
    };
  }

  return null;
}

/**
 * Minimal HTML sanitizer for backend-authored article bodies.
 *
 * `vlog` content comes from CKEditor and the mls-v2 backend stores and returns
 * it VERBATIM — there is no bleach/sanitizer anywhere in the Django app (checked
 * against vlog/models.py and requirements.txt). Writing posts is staff-only, so
 * this is not open user input, but "only admins can post" is an access-control
 * assumption, not an output-encoding one: a compromised or careless staff
 * account, or any future loosening of that permission, would put script into
 * every reader's browser. Sanitizing at the render boundary costs nothing and
 * does not depend on that assumption holding.
 *
 * Deliberately an allowlist: anything not named here is dropped. This runs on
 * the server (article pages are Server Components), so there is no DOM to lean
 * on and no client bundle cost. If rich embeds are ever needed, widen the
 * allowlist explicitly rather than relaxing the default.
 *
 * The one rich embed allowed is a YouTube/Vimeo `<iframe>`, and only when its
 * `src` resolves through `getVideoEmbed()`. The iframe is never passed through:
 * it is REBUILT from the validated video id plus a fixed attribute set, so
 * nothing the author wrote (srcdoc, on*, sandbox escapes, odd quoting) can
 * reach the output. See `extractEmbeds` below.
 */

import { getVideoEmbed } from "@/lib/utils/video";

/** Tags a prose article legitimately needs. */
const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "sub", "sup",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "span", "div",
]);

/** Attributes allowed per tag. Nothing carries `style`, `class` or any `on*`. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  td: new Set(["colspan", "rowspan"]),
};

/** Blocks javascript:, data: and other script-bearing URL schemes. */
function safeUrl(value: string, allowData: boolean): string | null {
  const url = value.trim();
  // Strip control characters and entity-encoded colons used to smuggle schemes.
  const probe = url.replace(/[\u0000-\u0020]/g, "").toLowerCase();
  if (probe.startsWith("javascript:") || probe.startsWith("vbscript:")) return null;
  if (probe.startsWith("data:")) {
    // Inline images are common in CKEditor output; scripts in a data: URL are not.
    return allowData && /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(probe)
      ? url
      : null;
  }
  return url;
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/*
 * Embed placeholders. NUL cannot appear in the author's HTML (it is stripped
 * up front), so a placeholder can only come from `extractEmbeds` — an author
 * cannot forge one to smuggle markup in. The surrounding spaces matter: a
 * placeholder glued to a half-written tag (`<img` + placeholder) then parses
 * as that tag's attribute text and is discarded by the tag walker, instead of
 * landing inside a tag at render time.
 */
const EMBED_TOKEN = /\u0000EMBED(\d+)\u0000/g;
const embedToken = (index: number) => ` \u0000EMBED${index}\u0000 `;

/** Minimal entity decoding for a `src` value (CKEditor writes `&amp;` in URLs). */
function decodeAttr(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'");
}

/**
 * Replaces every `<iframe>` (with its body, or an unclosed opener) by either a
 * placeholder for a rebuilt, known-good video embed or nothing.
 *
 * Only `src` and `title` are READ from the original tag; the emitted iframe is
 * assembled from `getVideoEmbed().embedUrl` (built from a validated id, never
 * the author's string) and constants. If the opener is mangled — a `>` inside
 * a quoted value, missing quotes — the worst case is that `src` isn't found and
 * the iframe is dropped.
 *
 * Unlike the post header's `VideoEmbed`, a static body iframe cannot cover the
 * end-screen suggestions; `rel=0` at least limits them to the same channel.
 */
function extractEmbeds(html: string, embeds: string[]): string {
  return html.replace(
    /<iframe\b([^>]*)>(?:[\s\S]*?<\/iframe\s*>)?/gi,
    (_match, rawAttrs: string) => {
      let src: string | null = null;
      let title: string | null = null;
      const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
      let found: RegExpExecArray | null;
      while ((found = pattern.exec(rawAttrs)) !== null) {
        const name = found[1].toLowerCase();
        const value = found[3] ?? found[4] ?? found[5] ?? "";
        if (name === "src" && src === null) src = decodeAttr(value);
        if (name === "title" && title === null) title = decodeAttr(value);
      }

      const embed = getVideoEmbed(src);
      if (!embed) return "";

      const label = (title ?? "").trim().slice(0, 200) ||
        (embed.provider === "youtube" ? "YouTube video" : "Vimeo video");
      embeds.push(
        `<iframe src="${escapeAttr(embed.embedUrl)}" title="${escapeAttr(label)}"` +
          ` loading="lazy"` +
          ` allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"` +
          ` referrerpolicy="strict-origin-when-cross-origin" allowfullscreen` +
          // Inline so the embed is responsive without depending on page CSS.
          ` style="display:block;width:100%;height:auto;aspect-ratio:16/9;border:0;border-radius:var(--radius-surface, 1rem)"` +
          `></iframe>`,
      );
      return embedToken(embeds.length - 1);
    },
  );
}

/**
 * Returns HTML containing only allowlisted tags and attributes.
 *
 * `<script>` and `<style>` are dropped WITH their contents; other disallowed
 * tags are unwrapped so their text survives — dropping a stray `<font>` should
 * not silently delete the paragraph inside it.
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";

  // NUL has no business in HTML and is our placeholder delimiter; strip it
  // first so the author cannot forge an embed placeholder.
  const embeds: string[] = [];
  let html = extractEmbeds(input.replace(/\u0000/g, ""), embeds);

  // Remove script/style/iframe/object bodies outright before tag walking.
  // (Any iframe still present here was assembled by the removals below or is
  // otherwise not a recognised embed — it is dropped, never rebuilt.)
  html = html.replace(
    /<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?<\/\1\s*>/gi,
    "",
  );
  // ...and any unclosed opener of the same, which would otherwise be unwrapped.
  html = html.replace(/<\/?(script|style|iframe|object|embed|noscript|template)\b[^>]*>/gi, "");
  // Comments can hide conditional-comment script in old engines.
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  // NOTE the `[\s/]` before the attribute group: `<svg/onload=alert(1)>` has no
  // whitespace after the tag name, and a pattern that demands one leaves the
  // whole tag unmatched — and therefore emitted VERBATIM. Matching the slash
  // here is what turns that case into a dropped tag instead of live script.
  html = html.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9:_-]*)((?:[\s/][^<>]*?)?)\/?>/g,
    (match, rawName: string, rawAttrs: string) => {
      const tag = rawName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (match.startsWith("</")) return `</${tag}>`;

      const allowed = ALLOWED_ATTRS[tag];
      let attrs = "";
      if (allowed && rawAttrs) {
        const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
        let found: RegExpExecArray | null;
        while ((found = pattern.exec(rawAttrs)) !== null) {
          const name = found[1].toLowerCase();
          if (!allowed.has(name)) continue;
          // Placeholders never belong inside an attribute value.
          const value = (found[3] ?? found[4] ?? found[5] ?? "").replace(EMBED_TOKEN, "");
          if (name === "href" || name === "src") {
            const safe = safeUrl(value, name === "src");
            if (safe === null) continue;
            attrs += ` ${name}="${escapeText(safe).replace(/"/g, "&quot;")}"`;
          } else {
            attrs += ` ${name}="${escapeText(value).replace(/"/g, "&quot;")}"`;
          }
        }
      }

      // Any link that opens a new tab gets noopener — target without it hands
      // the opener reference to the destination page.
      if (tag === "a" && /target\s*=/.test(attrs) && !/rel\s*=/.test(attrs)) {
        attrs += ' rel="noopener noreferrer"';
      }
      if (tag === "img" && !/\balt=/.test(attrs)) attrs += ' alt=""';

      const selfClosing = tag === "br" || tag === "hr" || tag === "img";
      return `<${tag}${attrs}${selfClosing ? " /" : ""}>`;
    },
  );

  // Placeholders the walker consumed (inside a dropped tag's attributes) are
  // simply gone; the rest become the rebuilt iframes.
  return html.replace(EMBED_TOKEN, (_m, index: string) => embeds[Number(index)] ?? "");
}

/**
 * True when the body still has visible content after sanitizing.
 *
 * An embed-only body (a pasted video and nothing else) counts as content: the
 * iframe has no text, so a text-only check would report it empty.
 */
export function hasVisibleHtml(html: string): boolean {
  if (/<(iframe|img)\b/i.test(html)) return true;
  return html.replace(/<[^>]*>/g, "").trim().length > 0;
}

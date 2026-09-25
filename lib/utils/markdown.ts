/**
 * Post bodies arrive in two formats.
 *
 * Posts written in the Studio (and in Django admin's CKEditor) are HTML. Posts
 * pasted in from elsewhere — and every excerpt typed into a plain textarea —
 * are Markdown with `\r\n` line breaks. Rendering Markdown as HTML collapses
 * every newline, so `## Heading`, `**bold**` and table pipes show up as one raw
 * run-on paragraph. Everything that displays post text goes through here first.
 *
 * The output of `toArticleHtml` is NOT safe on its own: Markdown may carry raw
 * HTML. It must still pass through `sanitizeHtml()` — `ArticleBody` does both.
 */

import { Marked } from "marked";

// A private instance, so no other importer can change our parsing options.
const parser = new Marked({ gfm: true, breaks: false });

/**
 * Block-level (or clearly editor-produced) tags. Their presence means the body
 * is already HTML; inline `<b>` in otherwise-Markdown text does not qualify.
 */
const HTML_BLOCK =
  /<(p|div|h[1-6]|ul|ol|li|br|table|blockquote|figure|pre|hr|img|iframe)\b[^>]*\/?>/i;

export function looksLikeHtml(text: string): boolean {
  return HTML_BLOCK.test(text);
}

/** HTML for a post body, converting Markdown when that's what was stored. */
export function toArticleHtml(input: string | null | undefined): string {
  if (!input) return "";
  if (looksLikeHtml(input)) return input;
  return parser.parse(input.replace(/\r\n?/g, "\n"), { async: false }) as string;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/**
 * Readable plain text from Markdown or HTML — for excerpts, cards and meta
 * descriptions, where markup would show as literal `##` and `**`.
 */
export function toPlainText(input: string | null | undefined): string {
  if (!input) return "";
  return toArticleHtml(input)
    // Tags become spaces so adjacent blocks and table cells don't fuse.
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Cuts at a word boundary and adds an ellipsis; returns short text unchanged. */
export function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

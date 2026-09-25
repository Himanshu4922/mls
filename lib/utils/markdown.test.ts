import { describe, expect, it } from "vitest";
import { looksLikeHtml, toArticleHtml, toPlainText, truncateText } from "@/lib/utils/markdown";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";

const MARKDOWN = [
  "## Navigating the Market",
  "",
  "Whether you are a **first-time buyer** or [an owner](https://example.com/).",
  "",
  "---",
  "",
  "| Benefit | How |",
  "| :--- | :--- |",
  "| **Confidence** | Data, not guesswork. |",
  "",
  "* **Strategy:** Pricing.",
  "",
  "> **Bottom line:** Pick well.",
].join("\r\n");

describe("toArticleHtml", () => {
  it("converts Markdown bodies (with CRLF) into block HTML", () => {
    const html = toArticleHtml(MARKDOWN);
    expect(html).toContain("<h2>Navigating the Market</h2>");
    expect(html).toContain("<strong>first-time buyer</strong>");
    expect(html).toContain('<a href="https://example.com/">an owner</a>');
    expect(html).toContain("<table>");
    expect(html).toContain("<blockquote>");
    expect(html).not.toContain("**");
    expect(html).not.toContain(":---");
  });

  it("passes HTML bodies through untouched", () => {
    const html = "<p>Already <strong>HTML</strong></p>";
    expect(looksLikeHtml(html)).toBe(true);
    expect(toArticleHtml(html)).toBe(html);
  });

  it("still gets sanitized — raw script in Markdown doesn't survive", () => {
    const clean = sanitizeHtml(toArticleHtml("Hi\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))"));
    expect(clean).not.toMatch(/<script|javascript:/i);
  });

  it("handles empty input", () => {
    expect(toArticleHtml(null)).toBe("");
  });
});

describe("toPlainText", () => {
  it("strips Markdown syntax for excerpts", () => {
    const text = toPlainText(MARKDOWN);
    expect(text.startsWith("Navigating the Market Whether you are a first-time buyer")).toBe(true);
    expect(text).not.toMatch(/[#*|]|:---/);
  });

  it("decodes entities", () => {
    expect(toPlainText("Tom &amp; Jerry's \"house\"")).toBe(`Tom & Jerry's "house"`);
  });
});

describe("truncateText", () => {
  it("cuts on a word boundary", () => {
    expect(truncateText("alpha beta gamma delta", 15)).toBe("alpha beta…");
    expect(truncateText("short", 12)).toBe("short");
  });
});

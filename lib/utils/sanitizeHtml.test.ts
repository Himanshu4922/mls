import { describe, expect, it } from "vitest";
import { hasVisibleHtml, sanitizeHtml } from "./sanitizeHtml";

const ID = "dQw4w9WgXcQ";

/** Every iframe src in the output — the only thing that can load a frame. */
function iframeSrcs(html: string): string[] {
  return [...html.matchAll(/<iframe\b[^>]*\bsrc="([^"]*)"/gi)].map((m) => m[1]);
}

describe("sanitizeHtml — video iframes", () => {
  it("keeps a YouTube iframe and rewrites it to the nocookie embed", () => {
    const out = sanitizeHtml(
      `<p>Intro</p><iframe width="560" height="315" src="https://www.youtube.com/embed/${ID}?autoplay=1&amp;rel=1" title="Tour" frameborder="0" onload="alert(1)" allowfullscreen></iframe>`,
    );
    expect(iframeSrcs(out)).toEqual([
      `https://www.youtube-nocookie.com/embed/${ID}?rel=0&amp;modestbranding=1&amp;playsinline=1&amp;iv_load_policy=3&amp;enablejsapi=1`,
    ]);
    expect(out).toContain('title="Tour"');
    expect(out).toContain('loading="lazy"');
    expect(out).toContain('referrerpolicy="strict-origin-when-cross-origin"');
    expect(out).not.toMatch(/onload|autoplay=1|frameborder/i);
    expect(out).toContain("<p>Intro</p>");
  });

  it("accepts watch / youtu.be / Vimeo URLs and odd quoting", () => {
    expect(iframeSrcs(sanitizeHtml(`<iframe src='https://youtu.be/${ID}'></iframe>`))).toHaveLength(1);
    expect(iframeSrcs(sanitizeHtml(`<IFRAME SRC=https://www.youtube.com/watch?v=${ID}>`))).toHaveLength(1);
    expect(iframeSrcs(sanitizeHtml(`<iframe src="https://vimeo.com/123456789"></iframe>`))).toEqual([
      "https://player.vimeo.com/video/123456789?dnt=1",
    ]);
  });

  it("removes iframes that do not resolve to a known video", () => {
    const cases = [
      `<iframe src="https://evil.example/embed/${ID}"></iframe>`,
      `<iframe src="javascript:alert(1)"></iframe>`,
      `<iframe srcdoc="<script>alert(1)</script>"></iframe>`,
      `<iframe data-src="https://www.youtube.com/embed/${ID}" src="https://evil.example"></iframe>`,
      `<iframe src="data:text/html,<script>alert(1)</script>"></iframe>`,
      `<iframe/src="https://evil.example">`,
    ];
    for (const html of cases) {
      const out = sanitizeHtml(html);
      expect(out, html).not.toMatch(/<iframe/i);
      expect(out, html).not.toMatch(/evil|javascript:|<script/i);
    }
  });

  it("never copies author attributes, even when a valid src is present", () => {
    const out = sanitizeHtml(
      `<iframe src="https://www.youtube.com/embed/${ID}" srcdoc="<b>x</b>" sandbox="allow-scripts" title='"><script>alert(1)</script>'></iframe>`,
    );
    expect(iframeSrcs(out)).toHaveLength(1);
    expect(out).not.toMatch(/srcdoc|sandbox|<script/i);
  });

  it("cannot forge an embed placeholder or break out of an attribute", () => {
    const forged = sanitizeHtml("<p>\u0000EMBED0\u0000</p>");
    expect(forged).not.toMatch(/<iframe|\u0000/);

    const nested = sanitizeHtml(
      `<a href="/x" title="<iframe src=https://youtu.be/${ID}></iframe>">link</a>`,
    );
    expect(nested).not.toMatch(/<iframe|\u0000/);
  });

  it("still strips script, style and event handlers", () => {
    const out = sanitizeHtml(
      `<script>alert(1)</script><p onclick="x()">Hi</p><svg/onload=alert(1)><style>p{}</style>`,
    );
    expect(out).toBe("<p>Hi</p>");
  });
});

describe("hasVisibleHtml", () => {
  it("treats an embed-only body as content", () => {
    expect(hasVisibleHtml(sanitizeHtml(`<p><iframe src="https://youtu.be/${ID}"></iframe></p>`))).toBe(true);
  });
  it("treats empty markup as empty", () => {
    expect(hasVisibleHtml(sanitizeHtml("<p> </p><iframe src='https://evil.example'></iframe>"))).toBe(false);
  });
});

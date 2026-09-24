import { describe, expect, it } from "vitest";
import { parsePreconSegment, preconCanonical } from "./seo";

describe("pre-con URLs", () => {
  it("parses the leading id from id-slug and bare-id segments", () => {
    expect(parsePreconSegment("42-skyline-condos")).toBe(42);
    expect(parsePreconSegment("42")).toBe(42);
    expect(parsePreconSegment("42abc")).toBeNull();
    expect(parsePreconSegment("skyline")).toBeNull();
    expect(parsePreconSegment("0-x")).toBeNull();
  });
  it("prefers the backend slug, falls back to the title", () => {
    expect(preconCanonical({ id: 7, slug: "skyline", title: "Ignored" })).toBe("/preconstruction/7-skyline");
    expect(preconCanonical({ id: 7, slug: null, title: "Skyline Condos — Tower 1" })).toBe(
      "/preconstruction/7-skyline-condos-tower-1",
    );
  });
});

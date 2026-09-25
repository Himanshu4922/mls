import { describe, expect, it } from "vitest";
import { toBackendParams } from "@/lib/api/properties";
import { CURATED_PAGES, curatedGroups, getCuratedPage } from "./curatedPages";

describe("curated pages", () => {
  it("has unique, URL-safe slugs", () => {
    const slugs = CURATED_PAGES.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("keyword pages search strictly, with phrases only", () => {
    const page = getCuratedPage("power-of-sale")!;
    const params = toBackendParams(page.query);
    expect(params.keywords).toContain("power of sale");
    expect(params.allow_fallback).toBe("false");
    // Single short tokens over-match free text ("POS" is inside "possession").
    for (const keyword of page.query.keywords!) expect(keyword.toLowerCase()).not.toBe("pos");
  });

  it("types filter server-side", () => {
    expect(toBackendParams(getCuratedPage("condos-under-500k")!.query)).toMatchObject({ home_type: "condo", price_max: 500000 });
    expect(toBackendParams(getCuratedPage("luxury-homes")!.query).price_min).toBe(2_000_000);
  });

  it("groups exclude city pages unless asked", () => {
    expect(curatedGroups().some((g) => g.group === "By city")).toBe(false);
    expect(curatedGroups({ includeCities: true }).some((g) => g.group === "By city")).toBe(true);
  });
});

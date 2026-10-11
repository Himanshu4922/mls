import { describe, expect, it } from "vitest";
import defaults from "@/lib/site/defaults.json";
import { validateChrome, validateHomepage, validateSeo } from "@/lib/site/validate";
import type { HomepageDocument } from "@/lib/site/types";

describe("site editor limits", () => {
  it("accepts the seeded site copy", () => {
    expect(validateHomepage(defaults.homepage as HomepageDocument)).toEqual({});
    expect(validateChrome(defaults.chrome)).toEqual({});
    expect(validateSeo(defaults.seo)).toEqual({});
  });

  it("rejects a javascript footer link", () => {
    const errors = validateChrome({
      announcement: { items: [{ text: "Hello", label: "", href: "" }] },
      nav: { links: [{ label: "Buy", href: "javascript:alert(1)" }, { label: "Rent", href: "/listings" }], ctaLabel: "Eval", ctaHref: "/home-evaluation" },
      footer: {
        bannerEyebrow: "Still looking?",
        bannerHeading: "Find a home.",
        bannerLabel: "Browse",
        bannerHref: "/listings",
        blurb: "A short blurb.",
        socials: [],
        columns: [{ heading: "Explore", links: [{ label: "Buy", href: "/listings" }] }],
      },
      contact: { whatsapp: "14168214200" },
    });
    expect(errors["nav.links.0.href"]).toBeTruthy();
  });

  it("rejects a share image without alt text", () => {
    const errors = validateSeo({
      title: "HomeAtlas",
      description: "Search the GTA.",
      shareImageUrl: "https://res.cloudinary.com/demo/image/upload/hero.jpg",
      shareImageAlt: "",
    });
    expect(errors.shareImageAlt).toBeTruthy();
  });
});

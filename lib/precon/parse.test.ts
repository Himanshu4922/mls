import { describe, expect, it } from "vitest";
import { mapPreconDetail } from "@/lib/api/preconstruction";
import {
  formatRange,
  getOverviewHtml,
  parseDepositPlans,
  parseDocuments,
  parseHomeCollections,
  parseJsonArray,
  parseLabelValues,
  parseNearbyPlaces,
  parsePreconMeta,
  parseStringList,
  splitAttachments,
  splitList,
  toMeta,
} from "./parse";

describe("JSON meta never throws", () => {
  const junk = ["", "   ", "{", "null", "42", '"text"', '{"a":1}', "[null, {}, []]", undefined, null];
  it.each(junk)("tolerates %s", (value) => {
    expect(() => parseJsonArray(value as string)).not.toThrow();
    expect(parseStringList(value as string)).toEqual([]);
    expect(parseNearbyPlaces(value as string)).toEqual([]);
    expect(parseLabelValues(value as string)).toEqual([]);
    expect(parseHomeCollections(value as string)).toEqual([]);
    expect(parseDepositPlans(value as string)).toEqual([]);
  });
});

describe("lists", () => {
  it("splits, trims and dedupes delimited meta", () => {
    expect(splitList(" Pool | Gym || Pool ", "|")).toEqual(["Pool", "Gym"]);
    expect(splitList("Condo, Townhouse", ",")).toEqual(["Condo", "Townhouse"]);
    expect(splitList(undefined, ",")).toEqual([]);
  });
  it("keeps only non-empty strings (numbers coerced)", () => {
    expect(parseStringList('["Quartz counters", "", 9, null, "Quartz counters"]')).toEqual([
      "Quartz counters",
      "9",
    ]);
  });
  it("coerces meta values to strings", () => {
    expect(toMeta({ a: "x", b: 2, c: null, d: { x: 1 } })).toEqual({ a: "x", b: "2" });
    expect(toMeta(null)).toEqual({});
    expect(toMeta(["x"])).toEqual({});
  });
});

describe("deposit plans", () => {
  it("parses JSON plans and moves a bare % out of amount", () => {
    const plans = parseDepositPlans(
      JSON.stringify([
        {
          title: "Standard",
          installments: [
            { milestone: "On signing", amount: "$5,000" },
            { milestone: "In 30 days", amount: "5%" },
            { milestone: "In 90 days", amount: "$10,000", percentage: 2.5 },
            { amount: "no milestone" },
          ],
        },
        { title: "Broken" },
      ]),
    );
    expect(plans).toEqual([
      {
        title: "Standard",
        installments: [
          { milestone: "On signing", amount: "$5,000", percentage: null },
          { milestone: "In 30 days", amount: null, percentage: "5%" },
          { milestone: "In 90 days", amount: "$10,000", percentage: "2.5%" },
        ],
      },
    ]);
  });
  it("falls back to deposit_structure split on ;", () => {
    expect(parseDepositPlans("{bad", "$5,000 on signing; 5% in 30 days;")).toEqual([
      {
        title: "Deposit structure",
        installments: [
          { milestone: "$5,000 on signing", amount: null, percentage: null },
          { milestone: "5% in 30 days", amount: null, percentage: null },
        ],
      },
    ]);
  });
});

describe("structured rows", () => {
  it("nearby places need a name; other fields optional", () => {
    expect(
      parseNearbyPlaces('[{"name":"GO Station","category":"Transit","travel_time":"5 min"},{"category":"x"}]'),
    ).toEqual([{ name: "GO Station", category: "Transit", travelTime: "5 min" }]);
  });
  it("home collections accept numeric fields", () => {
    expect(parseHomeCollections('[{"name":"The Oak","home_type":"Townhome","bedrooms":3,"starting_price":"$899,900"}]')).toEqual([
      {
        name: "The Oak",
        homeType: "Townhome",
        bedrooms: "3",
        bathrooms: null,
        area: null,
        startingPrice: "$899,900",
      },
    ]);
  });
  it("buyer information needs label and value", () => {
    expect(parseLabelValues('[{"label":"Assignment","value":"Free"},{"label":"x"}]')).toEqual([
      { label: "Assignment", value: "Free" },
    ]);
  });
});

describe("formatRange", () => {
  it("joins distinct bounds, collapses equal ones, falls back", () => {
    expect(formatRange("1", "3")).toBe("1–3");
    expect(formatRange("2", "2")).toBe("2");
    expect(formatRange("1200", undefined)).toBe("1,200");
    expect(formatRange(undefined, undefined, 4)).toBe("4");
    expect(formatRange("", "", null)).toBeNull();
    expect(formatRange("3+", undefined)).toBe("3+");
  });
});

describe("getOverviewHtml", () => {
  it("cuts the body at the first structured heading", () => {
    expect(getOverviewHtml("<p>Intro</p><h2>Deposit Structure</h2><p>5%</p>")).toBe("<p>Intro</p>");
  });
  it("keeps the body when no heading or heading is first", () => {
    expect(getOverviewHtml("<p>Only prose</p>")).toBe("<p>Only prose</p>");
    expect(getOverviewHtml("<h3>Project Highlights</h3><p>x</p>")).toBe("<h3>Project Highlights</h3><p>x</p>");
    expect(getOverviewHtml(null)).toBe("");
  });
});

describe("splitAttachments", () => {
  it("routes images to the gallery and PDFs to documents", () => {
    const result = splitAttachments([
      { url: "https://x.com/a.jpg", mime_type: "image/jpeg" },
      { url: "https://x.com/b.pdf", mime_type: "application/pdf", title: "Site plan" },
      { url: "https://x.com/c.webp" },
      { url: "" },
      "junk",
    ]);
    expect(result.images).toEqual(["https://x.com/a.jpg", "https://x.com/c.webp"]);
    expect(result.documents).toEqual([
      { url: "https://x.com/b.pdf", title: "Site plan", mimeType: "application/pdf" },
    ]);
    expect(splitAttachments(null)).toEqual({ images: [], documents: [] });
  });
});

describe("parsePreconMeta / parseDocuments", () => {
  it("maps meta with column fallbacks and ignores demo placeholders", () => {
    const fields = parsePreconMeta(
      toMeta({
        occupancy_year: "",
        estimated_completion: "2028",
        bedrooms_min: "1",
        bedrooms_max: "3",
        area_unit: "sq. ft.",
        city: "Vaughan",
        province: "ON",
        deposit_total_percentage: "20",
        sales_status: "DEMO",
      }),
      { bathrooms: 2, garages: 1 },
    );
    expect(fields.occupancy).toBe("2028");
    expect(fields.bedroomRange).toBe("1–3");
    expect(fields.bathroomRange).toBe("2");
    expect(fields.garageCount).toBe("1");
    expect(fields.areaUnit).toBe("sq. ft.");
    expect(fields.location).toBe("Vaughan, ON");
    expect(fields.depositTotal).toBe("20%");
    expect(fields.incentives).toEqual([]);
  });
  it("prefers backend flags, falls back to meta URLs", () => {
    expect(parseDocuments({ has_floor_plan: false }, { floor_plan_url: "https://x" })).toEqual({
      floorPlan: false,
      priceList: false,
      brochure: false,
    });
    expect(parseDocuments({}, { price_list_url: "https://x" }).priceList).toBe(true);
  });
});

describe("mapPreconDetail", () => {
  it("falls back to meta developer and featured image", () => {
    const detail = mapPreconDetail({
      id: 7,
      title: "Skyline",
      slug: "skyline",
      address: null,
      price: "650000",
      bedrooms: null,
      bathrooms: null,
      garages: null,
      area: null,
      lot_size: null,
      latitude: null,
      longitude: null,
      body: "<p>Hi</p>",
      attachments: [{ url: "https://x.com/doc.pdf", mime_type: "application/pdf" }],
      meta: { developer: "Acme Homes", featured_image_url: "https://x.com/hero.jpg" },
      has_floor_plan: true,
    });
    expect(detail.developer).toBe("Acme Homes");
    expect(detail.images).toEqual(["https://x.com/hero.jpg"]);
    expect(detail.attachmentsDocuments).toHaveLength(1);
    expect(detail.documents.floorPlan).toBe(true);
    expect(detail.price).toBe(650000);
  });
});

import { describe, expect, it } from "vitest";
import {
  boundsOverlap,
  isClusterReply,
  MAP_LIMIT,
  mapAggregatesUrl,
  mapListingsUrl,
  mapQueryView,
} from "./map";
import { valuationLookupUrl } from "./valuation";

const viewport = { latMin: 43.61234, latMax: 43.70001, lngMin: -79.45678, lngMax: -79.3, zoom: 12.4 };

describe("mapQueryView", () => {
  it("is null until a viewport is known", () => {
    expect(mapQueryView({ viewport: null, filters: "", poly: "" })).toBeNull();
  });

  it("rounds the viewport and sorts filters", () => {
    const view = mapQueryView({ viewport, filters: "type=condo&city=Toronto", poly: "" });
    expect(view).toEqual({
      bounds: [43.612, -79.457, 43.7, -79.3],
      zoom: 12,
      filters: "city=Toronto&type=condo",
      poly: "",
    });
  });

  it("ignores the viewport when an area is drawn, so panning keeps the key", () => {
    const a = mapQueryView({ viewport, filters: "", poly: "1,2;3,4;5,6" });
    const b = mapQueryView({ viewport: null, filters: "", poly: "1,2;3,4;5,6" });
    expect(a).toEqual(b);
  });
});

describe("map urls", () => {
  it("sends the box, filters and limit for a viewport", () => {
    const view = mapQueryView({ viewport, filters: "city=Toronto", poly: "" })!;
    const url = new URL(mapListingsUrl(view), "http://x");
    expect(url.pathname).toBe("/api/properties/map");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      city: "Toronto",
      lat_min: "43.612",
      lat_max: "43.7",
      lng_min: "-79.457",
      lng_max: "-79.3",
      limit: String(MAP_LIMIT),
    });
  });

  it("sends the shape instead of the box for a drawn area", () => {
    const view = mapQueryView({ viewport, filters: "", poly: "1,2;3,4;5,6" })!;
    const url = new URL(mapListingsUrl(view), "http://x");
    expect(url.searchParams.get("poly")).toBe("1,2;3,4;5,6");
    expect(url.searchParams.has("lat_min")).toBe(false);
  });

  it("builds the aggregates url from bounds and zoom only", () => {
    const view = mapQueryView({ viewport, filters: "city=Toronto", poly: "" })!;
    const url = new URL(mapAggregatesUrl(view), "http://x");
    expect(url.pathname).toBe("/api/properties/aggregates");
    expect(url.searchParams.get("zoom")).toBe("12");
    expect(url.searchParams.has("city")).toBe(false);
  });
});

describe("isClusterReply", () => {
  it("needs aggregates mode and at least one cluster", () => {
    expect(isClusterReply({ mode: "aggregates", clusters: [{ latitude: 1, longitude: 1, count: 3 }] })).toBe(true);
    expect(isClusterReply({ mode: "aggregates", clusters: [] })).toBe(false);
    expect(isClusterReply({ mode: "listings", clusters: [] })).toBe(false);
    expect(isClusterReply(undefined)).toBe(false);
  });
});

describe("valuationLookupUrl", () => {
  it("encodes the listing key and address", () => {
    const url = new URL(valuationLookupUrl({ listingKey: null, label: "1 Main St, Toronto" }), "http://x");
    expect(url.searchParams.get("listing_key")).toBe("");
    expect(url.searchParams.get("address")).toBe("1 Main St, Toronto");
  });
});

describe("boundsOverlap", () => {
  it("detects shared area and disjoint boxes", () => {
    expect(boundsOverlap([43.6, -79.5, 43.7, -79.3], [43.65, -79.4, 43.8, -79.2])).toBe(true);
    expect(boundsOverlap([43.6, -79.5, 43.7, -79.3], [43.8, -79.5, 43.9, -79.3])).toBe(false);
  });
});

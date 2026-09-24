import { describe, expect, it } from "vitest";
import {
  MAX_POLYGON_POINTS,
  getBoundingBoxFromPoints,
  isPointInPolygon,
  normalizePolygonRing,
  parsePolygonParam,
  serializePolygonParam,
  type LatLngPoint,
} from "./polygon";

const square: LatLngPoint[] = [
  { lat: 43.0, lng: -79.0 },
  { lat: 43.0, lng: -78.0 },
  { lat: 44.0, lng: -78.0 },
  { lat: 44.0, lng: -79.0 },
];

describe("normalizePolygonRing", () => {
  it("closes an open ring", () => {
    const ring = normalizePolygonRing(square);
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it("rejects fewer than three points", () => {
    expect(normalizePolygonRing(square.slice(0, 2))).toEqual([]);
  });
});

describe("isPointInPolygon", () => {
  it("detects inside, outside and on-edge points", () => {
    expect(isPointInPolygon({ lat: 43.5, lng: -78.5 }, square)).toBe(true);
    expect(isPointInPolygon({ lat: 42.5, lng: -78.5 }, square)).toBe(false);
    expect(isPointInPolygon({ lat: 43.0, lng: -78.5 }, square)).toBe(true);
  });
});

describe("getBoundingBoxFromPoints", () => {
  it("returns the extent", () => {
    expect(getBoundingBoxFromPoints(square)).toEqual({
      latMin: 43,
      latMax: 44,
      lngMin: -79,
      lngMax: -78,
    });
    expect(getBoundingBoxFromPoints([])).toBeNull();
  });
});

describe("poly URL param", () => {
  it("round-trips at 5 decimals", () => {
    const drawn = [
      { lat: 43.6532123, lng: -79.3832987 },
      { lat: 43.7, lng: -79.4 },
      { lat: 43.68, lng: -79.35 },
    ];
    const raw = serializePolygonParam(drawn);
    expect(raw).toBe("43.65321,-79.3833;43.7,-79.4;43.68,-79.35");
    expect(parsePolygonParam(raw)).toEqual([
      { lat: 43.65321, lng: -79.3833 },
      { lat: 43.7, lng: -79.4 },
      { lat: 43.68, lng: -79.35 },
    ]);
  });

  it("drops a repeated closing point", () => {
    const closed = normalizePolygonRing(square);
    expect(serializePolygonParam(closed).split(";")).toHaveLength(4);
    expect(parsePolygonParam("43,-79;43,-78;44,-78;43,-79")).toHaveLength(3);
  });

  it("rejects malformed values", () => {
    expect(parsePolygonParam("")).toBeNull();
    expect(parsePolygonParam("43,-79;43,-78")).toBeNull();
    expect(parsePolygonParam("43,-79;abc,-78;44,-78")).toBeNull();
    expect(parsePolygonParam("43,-79,1;43,-78;44,-78")).toBeNull();
    expect(parsePolygonParam("95,-79;43,-78;44,-78")).toBeNull();
    const tooMany = Array.from({ length: MAX_POLYGON_POINTS + 2 }, (_, i) => `43.${i},-79`);
    expect(parsePolygonParam(tooMany.join(";"))).toBeNull();
  });

  it("serializes nothing for an unusable shape", () => {
    expect(serializePolygonParam(undefined)).toBe("");
    expect(serializePolygonParam(square.slice(0, 2))).toBe("");
  });
});

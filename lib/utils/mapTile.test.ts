import { describe, expect, it } from "vitest";
import { latLonToTile, schoolLocationImageSrc } from "@/lib/utils/mapTile";

describe("latLonToTile", () => {
  it("maps downtown Toronto to a stable OSM tile", () => {
    const tile = latLonToTile(43.655, -79.379, 16);
    expect(tile).toEqual({ z: 16, x: 18317, y: 23917 });
  });

  it("clamps zoom into the slippy-map range", () => {
    expect(latLonToTile(43.65, -79.38, 99).z).toBe(18);
    expect(latLonToTile(43.65, -79.38, 0).z).toBe(1);
  });
});

describe("schoolLocationImageSrc", () => {
  it("builds the cached proxy URL", () => {
    expect(schoolLocationImageSrc(43.655, -79.379, 16)).toBe(
      "/api/geo/static-map?lat=43.655000&lon=-79.379000&z=16",
    );
  });
});

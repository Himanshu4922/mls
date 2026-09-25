import { describe, expect, it } from "vitest";
import { isInOntario } from "./useUserLocation";

describe("isInOntario", () => {
  it("accepts GTA and northern Ontario points", () => {
    expect(isInOntario([43.6532, -79.3832])).toBe(true); // Toronto
    expect(isInOntario([46.49, -80.99])).toBe(true); // Sudbury
  });

  it("rejects points outside the province", () => {
    expect(isInOntario([45.5019, -73.5674])).toBe(false); // Montreal
    expect(isInOntario([28.6139, 77.209])).toBe(false); // Delhi
  });
});

import { describe, expect, it } from "vitest";
import { sampleAssignment, sampleAssignmentPage, sampleSimilarAssignments } from "./assignments";

describe("sample assignments", () => {
  it("pages the full set and keeps later pages", () => {
    const first = sampleAssignmentPage({ page: 1, pageSize: 12 });
    const second = sampleAssignmentPage({ page: 2, pageSize: 12 });
    expect(first.count).toBeGreaterThan(12);
    expect(first.results).toHaveLength(12);
    expect(second.results.length).toBe(first.count - 12);
    expect(second.results[0]?.id).not.toBe(first.results[0]?.id);
  });

  it("filters by city and price cap", () => {
    const toronto = sampleAssignmentPage({ city: "Toronto" });
    expect(toronto.results.every((listing) => listing.city === "Toronto")).toBe(true);
    expect(toronto.count).toBeGreaterThan(0);

    const under600 = sampleAssignmentPage({ priceMax: 600_000 });
    expect(under600.results.every((listing) => (listing.askingPrice ?? 0) <= 600_000)).toBe(true);
    expect(under600.count).toBeGreaterThan(0);
  });

  it("resolves a known id and suggests other assignments", () => {
    expect(sampleAssignment(101)?.projectName).toBe("Harbour House");
    expect(sampleAssignment(999)).toBeNull();
    const similar = sampleSimilarAssignments(101);
    expect(similar.length).toBeGreaterThan(0);
    expect(similar.some((listing) => listing.id === 101)).toBe(false);
    expect(similar[0]?.city).toBe("Toronto");
  });
});

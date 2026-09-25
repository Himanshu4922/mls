import { describe, expect, it } from "vitest";
import { mapAvmDetails } from "./valuation";
import { resolvePropertyType } from "./mappers";
import type { BackendPropertySummary } from "@/lib/types/backend";
import { mapPropertySummary } from "./mappers";

const row = (overrides: Partial<BackendPropertySummary>) =>
  ({
    listing_key: "k",
    list_price: null,
    lease_amount: null,
    standard_status: "Active",
    ...overrides,
  }) as unknown as BackendPropertySummary;

describe("mapPropertySummary rent", () => {
  it("reads the rent from total_actual_rent, where most DDF rentals keep it", () => {
    const summary = mapPropertySummary(row({ total_actual_rent: "1500.00" }));
    expect(summary.isLease).toBe(true);
    expect(summary.price).toBe(1500);
  });

  it("prefers lease_amount when both are set", () => {
    const summary = mapPropertySummary(row({ lease_amount: "2800.00", total_actual_rent: "1500.00" }));
    expect(summary.price).toBe(2800);
  });

  it("keeps a sale listing as a sale", () => {
    const summary = mapPropertySummary(row({ list_price: "899000" }));
    expect(summary.isLease).toBe(false);
    expect(summary.price).toBe(899000);
  });
});

describe("mapAvmDetails", () => {
  it("maps snake_case, keeps false booleans, nulls blanks", () => {
    const details = mapAvmDetails({ frontage_ft: "38.93", air_conditioning: false, pool: null, basement: "  ", year_built: 1995 });
    expect(details.frontageFt).toBe(38.93);
    expect(details.airConditioning).toBe(false);
    expect(details.pool).toBeNull();
    expect(details.basement).toBeNull();
    expect(details.yearBuilt).toBe(1995);
  });

  it("returns an all-null column for a missing payload", () => {
    expect(Object.values(mapAvmDetails(undefined)).every((value) => value === null)).toBe(true);
  });
});

describe("resolvePropertyType", () => {
  it("uses structure type over the generic Single Family sub-type", () => {
    expect(resolvePropertyType("Single Family", "Apartment", true).uiType).toBe("Condo");
    expect(resolvePropertyType("Single Family", "Row / Townhouse", true).uiType).toBe("Townhome");
    expect(resolvePropertyType("Single Family", "House", false).uiType).toBe("Detached");
    expect(resolvePropertyType("Single Family", "House", true).uiType).toBe("Semi-Detached");
  });

  it("falls back to the sub-type when structure is missing", () => {
    expect(resolvePropertyType("Condo Apartment", null, null).uiType).toBe("Condo");
  });
});

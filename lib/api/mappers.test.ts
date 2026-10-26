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
    const details = mapAvmDetails({
      roll_number: "316030180",
      community: "Lakeshore",
      unit_number: "17",
      locker: true,
      potl_monthly_fees: null,
      maintenance: "170.00",
      maintenance_includes: "Water, Insurance",
      list_price: 935000,
      last_sold_price: 880000,
      days_on_market: 21,
      above_grade_sqft: 1850,
      garage_spaces: 2,
      family_room: false,
      kitchens: 1,
      frontage_ft: "38.93",
      air_conditioning: false,
      pool: null,
      basement: "  ",
      basement_total_sqft: 747,
      basement_finished_sqft: 280,
      structure_condition: "Average",
      garage_type: "Attached Garage",
      garage_area: 480,
      renovation_year: 2015,
      renovation_type: "Exterior",
      year_built: 1995,
    });
    expect(details.rollNumber).toBe("316030180");
    expect(details.community).toBe("Lakeshore");
    expect(details.unitNumber).toBe("17");
    expect(details.locker).toBe(true);
    expect(details.potlMonthlyFees).toBeNull();
    expect(details.maintenance).toBe(170);
    expect(details.maintenanceIncludes).toBe("Water, Insurance");
    expect(details.listPrice).toBe(935000);
    expect(details.lastSoldPrice).toBe(880000);
    expect(details.daysOnMarket).toBe(21);
    expect(details.aboveGradeSqft).toBe(1850);
    expect(details.garageSpaces).toBe(2);
    expect(details.familyRoom).toBe(false);
    expect(details.kitchens).toBe(1);
    expect(details.frontageFt).toBe(38.93);
    expect(details.airConditioning).toBe(false);
    expect(details.pool).toBeNull();
    expect(details.basement).toBeNull();
    expect(details.basementTotalSqft).toBe(747);
    expect(details.basementFinishedSqft).toBe(280);
    expect(details.structureCondition).toBe("Average");
    expect(details.garageType).toBe("Attached Garage");
    expect(details.garageArea).toBe(480);
    expect(details.renovationYear).toBe(2015);
    expect(details.renovationType).toBe("Exterior");
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

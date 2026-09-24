import { describe, expect, it } from "vitest";
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

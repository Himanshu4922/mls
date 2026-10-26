import { describe, expect, it, vi, afterEach } from "vitest";
import { getWpCommunityProfile, resetWpCommunityCache } from "./wpCommunity";

afterEach(() => {
  resetWpCommunityCache();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getWpCommunityProfile", () => {
  it("maps WP community ACF fields and matches by city", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            title: { rendered: "Mississauga" },
            acf: {
              community_name: "Mississauga",
              community_subtext: "Urban living with suburban space",
              population: "765K",
              average_home_price: "$911K",
              "y-o-y_growth": "-5%",
              liability_score: "91/100",
              why_families_love: "Diverse neighbourhoods and amenities.",
              school_1: "John Fraser S.S.",
              school_1_rating: "8.2/10",
              school_1_type: "Public Secondary",
              parks_1: "Kariya Park",
              "dining_&_listing_1": "Snug Harbour",
              transit_1: "Port Credit GO Station",
              transit_1_subtext: "Lakeshore West",
              transit_1_time: "~25 min to Union",
            },
          },
        ],
      }),
    );

    const profile = await getWpCommunityProfile("Mississauga");
    expect(profile?.name).toBe("Mississauga");
    expect(profile?.population).toBe("765K");
    expect(profile?.averageHomePrice).toBe("$911K");
    expect(profile?.yoyGrowth).toBe("-5%");
    expect(profile?.livabilityScore).toBe("91/100");
    expect(profile?.schools).toEqual([
      { name: "John Fraser S.S.", rating: "8.2/10", type: "Public Secondary" },
    ]);
    expect(profile?.parks).toEqual(["Kariya Park"]);
    expect(profile?.dining).toEqual(["Snug Harbour"]);
    expect(profile?.transit[0]?.name).toBe("Port Credit GO Station");
  });

  it("returns null when the city is not in the WP catalogue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      }),
    );
    expect(await getWpCommunityProfile("Nowhereville")).toBeNull();
  });
});

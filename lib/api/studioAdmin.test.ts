import { describe, expect, it } from "vitest";
import { isNamedMetaKey, mapReviewSubmission, mapStudioPrecon } from "@/lib/api/studioAdmin";

describe("mapStudioPrecon", () => {
  it("parses decimals, drops unknown stages and keeps every meta key", () => {
    const project = mapStudioPrecon({
      id: 5,
      title: "  ",
      price: "699900.00",
      bathrooms: "2.5",
      sales_stage: "launching",
      is_featured: true,
      attachments: [{ url: "https://x/a.jpg", mime_type: "image/jpeg" }, { url: "" }],
      meta: { occupancy_year: "2028", deposit_plans_json: "[]", empty: null },
    });
    expect(project.title).toBe("Project #5");
    expect(project.price).toBe(699900);
    expect(project.bathrooms).toBe(2.5);
    expect(project.salesStage).toBeNull();
    expect(project.attachments).toHaveLength(1);
    expect(project.meta).toEqual({ occupancy_year: "2028", deposit_plans_json: "[]" });
  });
});

describe("isNamedMetaKey", () => {
  it("covers the form fields and documents but not imported JSON keys", () => {
    expect(isNamedMetaKey("price_list_url")).toBe(true);
    expect(isNamedMetaKey("location_display")).toBe(true);
    expect(isNamedMetaKey("home_collections_json")).toBe(false);
  });
});

describe("mapReviewSubmission", () => {
  it("titles by project, keeps only known decisions and splits media", () => {
    const submission = mapReviewSubmission({
      id: 9,
      purpose: "assignment",
      project_name: "Line 5",
      address_line_1: "1 Main St",
      asking_price: "650000.00",
      precon_property: 3,
      allowed_decisions: ["approved", "teleport", "rejected"],
      media: [
        { id: 1, media_type: "photo", url: "https://x/1.jpg" },
        { id: 2, media_type: "floor_plan", url: "https://x/fp.pdf", name: "fp.pdf" },
        { id: 3, media_type: "photo", url: "" },
      ],
    });
    expect(submission.title).toBe("Line 5");
    expect(submission.askingPrice).toBe(650000);
    expect(submission.preconId).toBe(3);
    expect(submission.allowedDecisions).toEqual(["approved", "rejected"]);
    expect(submission.media.map((m) => m.type)).toEqual(["photo", "floor_plan"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  fitWithin,
  needsResize,
  outputType,
  PDF_MAX_BYTES,
  renameFor,
  uploadBlocker,
  UPLOAD_TARGET_BYTES,
} from "@/lib/utils/imageResize";
import { toFieldErrors } from "@/lib/api/listingSubmissions";

describe("fitWithin", () => {
  it("leaves small images alone", () => {
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 });
  });
  it("scales the longest edge down to the cap, keeping aspect", () => {
    expect(fitWithin(5120, 2880)).toEqual({ width: 2560, height: 1440 });
    expect(fitWithin(3000, 6000, 2000)).toEqual({ width: 1000, height: 2000 });
  });
});

describe("needsResize", () => {
  it("skips files that are already light and small", () => {
    expect(needsResize(1_000_000, 2000, 1500)).toBe(false);
  });
  it("resizes heavy or oversized images", () => {
    expect(needsResize(UPLOAD_TARGET_BYTES + 1, 1000, 1000)).toBe(true);
    expect(needsResize(500_000, 4000, 3000)).toBe(true);
  });
});

describe("outputType / renameFor", () => {
  it("keeps PNG and WebP as WebP, photos as JPEG", () => {
    expect(outputType("image/png")).toBe("image/webp");
    expect(outputType("image/jpeg")).toBe("image/jpeg");
  });
  it("swaps the extension", () => {
    expect(renameFor("IMG_1.HEIC.png", "image/webp")).toBe("IMG_1.HEIC.webp");
    expect(renameFor("scan", "image/jpeg")).toBe("scan.jpg");
  });
});

describe("uploadBlocker", () => {
  it("rejects unsupported types and oversized PDFs", () => {
    expect(uploadBlocker({ type: "image/gif", size: 10 })).toMatch(/JPEG/);
    expect(uploadBlocker({ type: "application/pdf", size: PDF_MAX_BYTES + 1 })).toMatch(/4 MB/);
  });
  it("accepts large images (they get resized) and small PDFs", () => {
    expect(uploadBlocker({ type: "image/jpeg", size: 14_000_000 })).toBeNull();
    expect(uploadBlocker({ type: "application/pdf", size: 1_000_000 })).toBeNull();
  });
});

describe("toFieldErrors", () => {
  it("keeps the first message per field and skips non-field keys", () => {
    expect(
      toFieldErrors({
        city: ["This field is required.", "Other"],
        project_name: "Enter the project name.",
        detail: "Nope",
        non_field_errors: ["x"],
      }),
    ).toEqual({ city: "This field is required.", project_name: "Enter the project name." });
  });
  it("ignores non-object payloads and markup", () => {
    expect(toFieldErrors("oops")).toEqual({});
    expect(toFieldErrors({ a: ["<html>"] })).toEqual({});
  });
});

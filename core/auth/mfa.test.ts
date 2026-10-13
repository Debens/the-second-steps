import { describe, expect, it } from "vitest";
import { safePostMfaPath } from "./mfa-path";

describe("MFA return paths", () => {
  it("allows only dashboard and platform destinations", () => {
    expect(safePostMfaPath("/platform")).toBe("/platform");
    expect(safePostMfaPath("/platform/feature-flags")).toBe(
      "/platform/feature-flags",
    );
    expect(safePostMfaPath("/dashboard")).toBe("/dashboard");
    expect(safePostMfaPath("/dashboard/w/oakfield-lettings-demo")).toBe(
      "/dashboard/w/oakfield-lettings-demo",
    );
  });

  it("rejects external and unrelated destinations", () => {
    expect(safePostMfaPath("//example.com")).toBe("/dashboard");
    expect(safePostMfaPath("https://example.com")).toBe("/dashboard");
    expect(safePostMfaPath("/admin")).toBe("/dashboard");
    expect(safePostMfaPath(undefined)).toBe("/dashboard");
  });
});

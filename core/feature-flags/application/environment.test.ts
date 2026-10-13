import { describe, expect, it } from "vitest";
import { requireStaffMfaFromEnvironment } from "./environment";

describe("staff MFA release protection", () => {
  it("is disabled when unset or explicitly false", () => {
    expect(requireStaffMfaFromEnvironment(undefined)).toBe(false);
    expect(requireStaffMfaFromEnvironment("")).toBe(false);
    expect(requireStaffMfaFromEnvironment("false")).toBe(false);
  });

  it("is enabled only by the exact true value", () => {
    expect(requireStaffMfaFromEnvironment("true")).toBe(true);
  });

  it("rejects malformed values instead of guessing", () => {
    expect(() => requireStaffMfaFromEnvironment("yes")).toThrow(
      'REQUIRE_STAFF_MFA must be either "true" or "false".',
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  resolveFeatureFlag,
  unavailableFeatureFlagEvaluation,
} from "./feature-flag";

const activeDefinition = {
  globalEnabled: false,
  zaytoUsersEnabled: false,
  status: "ACTIVE" as const,
};

describe("feature flag precedence", () => {
  it("fails the staff MFA security control closed when evaluation is unavailable", () => {
    expect(unavailableFeatureFlagEvaluation("staff_mfa")).toEqual({
      enabled: true,
      source: "unavailable",
    });
  });

  it("defaults an unavailable flag to disabled", () => {
    expect(
      resolveFeatureFlag({
        key: "staff_mfa",
        definition: null,
        isStaff: true,
        isZaytoUser: false,
        workspaceOverride: null,
        requireStaffMfa: false,
      }),
    ).toEqual({ enabled: false, source: "unavailable" });
  });

  it("uses the global state when there is no more specific audience", () => {
    expect(
      resolveFeatureFlag({
        key: "staff_mfa",
        definition: { ...activeDefinition, globalEnabled: true },
        isStaff: true,
        isZaytoUser: false,
        workspaceOverride: null,
        requireStaffMfa: false,
      }),
    ).toEqual({ enabled: true, source: "global" });
  });

  it("allows a workspace override to turn a global flag on or off", () => {
    expect(
      resolveFeatureFlag({
        key: "staff_mfa",
        definition: activeDefinition,
        isStaff: true,
        isZaytoUser: false,
        workspaceOverride: true,
        requireStaffMfa: false,
      }),
    ).toEqual({ enabled: true, source: "workspace" });

    expect(
      resolveFeatureFlag({
        key: "staff_mfa",
        definition: { ...activeDefinition, globalEnabled: true },
        isStaff: true,
        isZaytoUser: false,
        workspaceOverride: false,
        requireStaffMfa: false,
      }),
    ).toEqual({ enabled: false, source: "workspace" });
  });

  it("gives the enabled Zayto testing audience highest database precedence", () => {
    expect(
      resolveFeatureFlag({
        key: "staff_mfa",
        definition: { ...activeDefinition, zaytoUsersEnabled: true },
        isStaff: true,
        isZaytoUser: true,
        workspaceOverride: false,
        requireStaffMfa: false,
      }),
    ).toEqual({ enabled: true, source: "zayto_users" });
  });

  it("does not treat an ordinary user as a Zayto tester", () => {
    expect(
      resolveFeatureFlag({
        key: "staff_mfa",
        definition: { ...activeDefinition, zaytoUsersEnabled: true },
        isStaff: true,
        isZaytoUser: false,
        workspaceOverride: null,
        requireStaffMfa: false,
      }),
    ).toEqual({ enabled: false, source: "global" });
  });

  it("forces staff MFA on when release protection is active", () => {
    expect(
      resolveFeatureFlag({
        key: "staff_mfa",
        definition: null,
        isStaff: true,
        isZaytoUser: false,
        workspaceOverride: false,
        requireStaffMfa: true,
      }),
    ).toEqual({ enabled: true, source: "release_protection" });
  });

  it("disables retired flags unless release protection requires MFA", () => {
    expect(
      resolveFeatureFlag({
        key: "staff_mfa",
        definition: { ...activeDefinition, status: "RETIRED" },
        isStaff: true,
        isZaytoUser: true,
        workspaceOverride: true,
        requireStaffMfa: false,
      }),
    ).toEqual({ enabled: false, source: "unavailable" });
  });

  it("does not require staff MFA from an identity with no active staff access", () => {
    expect(
      resolveFeatureFlag({
        key: "staff_mfa",
        definition: { ...activeDefinition, globalEnabled: true },
        isStaff: false,
        isZaytoUser: false,
        workspaceOverride: null,
        requireStaffMfa: true,
      }),
    ).toEqual({ enabled: false, source: "not_applicable" });
  });
});

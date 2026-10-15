import { describe, expect, it } from "vitest";
import {
  canAssignRole,
  hasPermission,
  permissionsForRoles,
  ROLE_LABELS,
  SYSTEM_ROLES,
  validateRoleCombination,
} from "./role";

describe("workspace roles", () => {
  it("uses Account Owner as the customer-facing owner label", () => {
    expect(ROLE_LABELS.workspace_owner).toBe("Account Owner");
  });

  it("defines a label for every role", () => {
    expect(Object.keys(ROLE_LABELS).sort()).toEqual([...SYSTEM_ROLES].sort());
  });

  it("gives Account Owners commercial and ownership administration access", () => {
    expect(
      hasPermission(["workspace_owner"], "workspace.commercial.manage"),
    ).toBe(true);
    expect(hasPermission(["workspace_owner"], "membership.roles.manage")).toBe(
      true,
    );
    expect(hasPermission(["workspace_owner"], "membership.scope.manage")).toBe(
      true,
    );
  });

  it("keeps commercial settings away from Agency Admins", () => {
    expect(hasPermission(["agency_admin"], "workspace.commercial.manage")).toBe(
      false,
    );
    expect(hasPermission(["agency_admin"], "membership.roles.manage")).toBe(
      true,
    );
    expect(hasPermission(["agency_admin"], "membership.scope.manage")).toBe(
      true,
    );
  });

  it("gives Branch Managers view-only staff access", () => {
    expect(hasPermission(["branch_manager"], "membership.read")).toBe(true);
    expect(hasPermission(["branch_manager"], "membership.invite")).toBe(false);
    expect(hasPermission(["branch_manager"], "membership.roles.manage")).toBe(
      false,
    );
    expect(hasPermission(["branch_manager"], "membership.scope.manage")).toBe(
      false,
    );
  });

  it("makes Read Only exclusive", () => {
    expect(validateRoleCombination(["read_only"]).ok).toBe(true);
    expect(validateRoleCombination(["read_only", "negotiator"])).toEqual({
      ok: false,
      reason: "read_only_must_be_exclusive",
    });
  });

  it("denies all permissions for an invalid or empty combination", () => {
    expect(permissionsForRoles([]).size).toBe(0);
    expect(permissionsForRoles(["read_only", "agency_admin"]).size).toBe(0);
  });

  it("combines compatible roles without duplicating permissions", () => {
    const permissions = permissionsForRoles(["negotiator", "accounts"]);

    expect(permissions).toEqual(new Set(["workspace.read", "branch.read"]));
  });

  it("allows only an Account Owner to assign the owner role", () => {
    expect(canAssignRole(["workspace_owner"], "workspace_owner")).toBe(true);
    expect(canAssignRole(["agency_admin"], "workspace_owner")).toBe(false);
  });

  it("allows Agency Admins to assign ordinary roles", () => {
    expect(canAssignRole(["agency_admin"], "negotiator")).toBe(true);
    expect(canAssignRole(["branch_manager"], "negotiator")).toBe(false);
  });
});

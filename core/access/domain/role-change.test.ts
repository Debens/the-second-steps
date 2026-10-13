import { describe, expect, it } from "vitest";
import { evaluateRoleChange } from "./role-change";

const base = {
  actorMembershipId: "actor",
  targetMembershipId: "target",
  actorRoles: ["workspace_owner"] as const,
  currentTargetRoles: ["negotiator"] as const,
  proposedTargetRoles: ["property_manager"] as const,
  otherActiveOwnerCount: 1,
};

describe("workspace role changes", () => {
  it("allows an Account Owner to change another ordinary member", () => {
    expect(evaluateRoleChange(base)).toEqual({ allowed: true });
  });

  it("blocks self role changes", () => {
    expect(
      evaluateRoleChange({ ...base, targetMembershipId: "actor" }),
    ).toEqual({ allowed: false, reason: "self_role_change" });
  });

  it("allows an Agency Admin to manage ordinary roles", () => {
    expect(
      evaluateRoleChange({ ...base, actorRoles: ["agency_admin"] }),
    ).toEqual({ allowed: true });
  });

  it("prevents an Agency Admin from granting Account Owner", () => {
    expect(
      evaluateRoleChange({
        ...base,
        actorRoles: ["agency_admin"],
        proposedTargetRoles: ["workspace_owner"],
      }),
    ).toEqual({ allowed: false, reason: "owner_role_requires_owner" });
  });

  it("protects the final active Account Owner", () => {
    expect(
      evaluateRoleChange({
        ...base,
        currentTargetRoles: ["workspace_owner"],
        proposedTargetRoles: ["agency_admin"],
        otherActiveOwnerCount: 0,
      }),
    ).toEqual({ allowed: false, reason: "last_active_owner" });
  });

  it("keeps Read Only exclusive", () => {
    expect(
      evaluateRoleChange({
        ...base,
        proposedTargetRoles: ["read_only", "negotiator"],
      }),
    ).toEqual({ allowed: false, reason: "invalid_role_combination" });
  });

  it("denies Branch Managers role administration", () => {
    expect(
      evaluateRoleChange({ ...base, actorRoles: ["branch_manager"] }),
    ).toEqual({ allowed: false, reason: "cannot_manage_roles" });
  });
});

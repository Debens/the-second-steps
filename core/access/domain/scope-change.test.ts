import { describe, expect, it } from "vitest";
import { evaluateScopeChange } from "./scope-change";

const base = {
  actorMembershipId: "actor",
  targetMembershipId: "target",
  actorRoles: ["workspace_owner"] as const,
  targetRoles: ["negotiator"] as const,
};

describe("workspace branch-scope changes", () => {
  it("allows Account Owners and Agency Admins to manage ordinary users", () => {
    expect(evaluateScopeChange(base)).toEqual({ allowed: true });
    expect(
      evaluateScopeChange({ ...base, actorRoles: ["agency_admin"] }),
    ).toEqual({ allowed: true });
  });

  it("keeps Branch Managers view-only", () => {
    expect(
      evaluateScopeChange({ ...base, actorRoles: ["branch_manager"] }),
    ).toEqual({ allowed: false, reason: "cannot_manage_scope" });
  });

  it("blocks self scope changes", () => {
    expect(
      evaluateScopeChange({ ...base, targetMembershipId: "actor" }),
    ).toEqual({ allowed: false, reason: "self_scope_change" });
  });

  it("allows only an Account Owner to change another owner scope", () => {
    expect(
      evaluateScopeChange({
        ...base,
        actorRoles: ["agency_admin"],
        targetRoles: ["workspace_owner"],
      }),
    ).toEqual({ allowed: false, reason: "owner_scope_requires_owner" });
  });
});

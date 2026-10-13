import { describe, expect, it } from "vitest";
import { hasBranchAccess, validateMembershipScope } from "./scope";

describe("membership scope", () => {
  it("allows a whole-workspace membership into every branch", () => {
    expect(hasBranchAccess({ kind: "workspace" }, "branch-a")).toBe(true);
    expect(hasBranchAccess({ kind: "workspace" }, "branch-b")).toBe(true);
  });

  it("limits named-branch membership to an explicit branch", () => {
    const scope = { kind: "named_branches", branchIds: ["branch-a"] } as const;

    expect(hasBranchAccess(scope, "branch-a")).toBe(true);
    expect(hasBranchAccess(scope, "branch-b")).toBe(false);
  });

  it("rejects an empty named-branch scope instead of treating it as full access", () => {
    expect(
      validateMembershipScope({ kind: "named_branches", branchIds: [] }),
    ).toEqual({ ok: false, reason: "branch_scope_requires_a_branch" });
  });

  it("deduplicates branch grants", () => {
    expect(
      validateMembershipScope({
        kind: "named_branches",
        branchIds: ["branch-a", "branch-a"],
      }),
    ).toEqual({
      ok: true,
      scope: { kind: "named_branches", branchIds: ["branch-a"] },
    });
  });
});

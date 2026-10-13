export type MembershipScope =
  | { kind: "workspace" }
  | { kind: "named_branches"; branchIds: readonly string[] };

export type ScopeValidationResult =
  | { ok: true; scope: MembershipScope }
  | { ok: false; reason: "branch_scope_requires_a_branch" };

export function validateMembershipScope(
  scope: MembershipScope,
): ScopeValidationResult {
  if (scope.kind === "workspace") return { ok: true, scope };

  const branchIds = [...new Set(scope.branchIds)];
  if (branchIds.length === 0) {
    return { ok: false, reason: "branch_scope_requires_a_branch" };
  }

  return { ok: true, scope: { kind: "named_branches", branchIds } };
}

export function hasBranchAccess(
  scope: MembershipScope,
  branchId: string,
): boolean {
  const validation = validateMembershipScope(scope);
  if (!validation.ok) return false;

  return (
    validation.scope.kind === "workspace" ||
    validation.scope.branchIds.includes(branchId)
  );
}

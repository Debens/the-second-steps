import { hasPermission, type SystemRole } from "./role";

export type ScopeChangeDenial =
  "self_scope_change" | "cannot_manage_scope" | "owner_scope_requires_owner";

export type ScopeChangeDecision =
  { allowed: true } | { allowed: false; reason: ScopeChangeDenial };

export function evaluateScopeChange(input: {
  actorMembershipId: string;
  targetMembershipId: string;
  actorRoles: readonly SystemRole[];
  targetRoles: readonly SystemRole[];
}): ScopeChangeDecision {
  if (!hasPermission(input.actorRoles, "membership.scope.manage")) {
    return { allowed: false, reason: "cannot_manage_scope" };
  }

  if (input.actorMembershipId === input.targetMembershipId) {
    return { allowed: false, reason: "self_scope_change" };
  }

  if (
    input.targetRoles.includes("workspace_owner") &&
    !input.actorRoles.includes("workspace_owner")
  ) {
    return { allowed: false, reason: "owner_scope_requires_owner" };
  }

  return { allowed: true };
}

import {
  canAssignRole,
  type SystemRole,
  validateRoleCombination,
} from "./role";

export type RoleChangeDenial =
  | "invalid_role_combination"
  | "self_role_change"
  | "cannot_manage_roles"
  | "owner_role_requires_owner"
  | "last_active_owner";

export type RoleChangeDecision =
  { allowed: true } | { allowed: false; reason: RoleChangeDenial };

export function evaluateRoleChange(input: {
  actorMembershipId: string;
  targetMembershipId: string;
  actorRoles: readonly SystemRole[];
  currentTargetRoles: readonly SystemRole[];
  proposedTargetRoles: readonly SystemRole[];
  otherActiveOwnerCount: number;
}): RoleChangeDecision {
  const proposed = validateRoleCombination(input.proposedTargetRoles);
  if (!proposed.ok) {
    return { allowed: false, reason: "invalid_role_combination" };
  }

  if (input.actorMembershipId === input.targetMembershipId) {
    return { allowed: false, reason: "self_role_change" };
  }

  if (!input.actorRoles.some((role) => canAssignRole(input.actorRoles, role))) {
    return { allowed: false, reason: "cannot_manage_roles" };
  }

  const targetIsOwner = input.currentTargetRoles.includes("workspace_owner");
  const targetWillBeOwner = proposed.roles.includes("workspace_owner");
  const actorIsOwner = input.actorRoles.includes("workspace_owner");

  if ((targetIsOwner || targetWillBeOwner) && !actorIsOwner) {
    return { allowed: false, reason: "owner_role_requires_owner" };
  }

  if (proposed.roles.some((role) => !canAssignRole(input.actorRoles, role))) {
    return { allowed: false, reason: "cannot_manage_roles" };
  }

  if (
    targetIsOwner &&
    !targetWillBeOwner &&
    input.otherActiveOwnerCount === 0
  ) {
    return { allowed: false, reason: "last_active_owner" };
  }

  return { allowed: true };
}

import type { Permission } from "./permission";

export const SYSTEM_ROLES = [
  "workspace_owner",
  "agency_admin",
  "branch_manager",
  "negotiator",
  "property_manager",
  "accounts",
  "read_only",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const ROLE_LABELS: Readonly<Record<SystemRole, string>> = {
  workspace_owner: "Account Owner",
  agency_admin: "Agency Admin",
  branch_manager: "Branch Manager",
  negotiator: "Negotiator",
  property_manager: "Property Manager",
  accounts: "Accounts",
  read_only: "Read Only",
};

const ROLE_PERMISSIONS: Readonly<Record<SystemRole, readonly Permission[]>> = {
  workspace_owner: [
    "workspace.read",
    "workspace.update",
    "workspace.commercial.manage",
    "membership.read",
    "membership.invite",
    "membership.roles.manage",
    "membership.suspend",
    "branch.read",
    "branch.manage",
    "audit.read",
  ],
  agency_admin: [
    "workspace.read",
    "workspace.update",
    "membership.read",
    "membership.invite",
    "membership.roles.manage",
    "membership.suspend",
    "branch.read",
    "branch.manage",
    "audit.read",
  ],
  branch_manager: ["workspace.read", "membership.read", "branch.read"],
  negotiator: ["workspace.read", "branch.read"],
  property_manager: ["workspace.read", "branch.read"],
  accounts: ["workspace.read", "branch.read"],
  read_only: ["workspace.read", "membership.read", "branch.read"],
};

export type RoleCombinationResult =
  | { ok: true; roles: readonly SystemRole[] }
  | { ok: false; reason: "no_roles" | "read_only_must_be_exclusive" };

export function isSystemRole(value: string): value is SystemRole {
  return SYSTEM_ROLES.some((role) => role === value);
}

export function validateRoleCombination(
  roles: readonly SystemRole[],
): RoleCombinationResult {
  const uniqueRoles = [...new Set(roles)];

  if (uniqueRoles.length === 0) return { ok: false, reason: "no_roles" };

  if (uniqueRoles.includes("read_only") && uniqueRoles.length > 1) {
    return { ok: false, reason: "read_only_must_be_exclusive" };
  }

  return { ok: true, roles: uniqueRoles };
}

export function permissionsForRoles(
  roles: readonly SystemRole[],
): ReadonlySet<Permission> {
  const validation = validateRoleCombination(roles);
  if (!validation.ok) return new Set<Permission>();

  return new Set(validation.roles.flatMap((role) => ROLE_PERMISSIONS[role]));
}

export function hasPermission(
  roles: readonly SystemRole[],
  permission: Permission,
): boolean {
  return permissionsForRoles(roles).has(permission);
}

export function canAssignRole(
  actorRoles: readonly SystemRole[],
  targetRole: SystemRole,
): boolean {
  if (!hasPermission(actorRoles, "membership.roles.manage")) return false;

  if (targetRole === "workspace_owner") {
    return actorRoles.includes("workspace_owner");
  }

  return (
    actorRoles.includes("workspace_owner") ||
    actorRoles.includes("agency_admin")
  );
}

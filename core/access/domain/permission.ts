export const PERMISSIONS = [
  "workspace.read",
  "workspace.update",
  "workspace.commercial.manage",
  "membership.read",
  "membership.invite",
  "membership.roles.manage",
  "membership.scope.manage",
  "membership.suspend",
  "branch.read",
  "branch.manage",
  "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return PERMISSIONS.some((permission) => permission === value);
}

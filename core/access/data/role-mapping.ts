import type { SystemRole } from "@/core/access/domain/role";
import type { MembershipRoleCode } from "@/core/db/generated/enums";

export const DATABASE_ROLE_TO_SYSTEM_ROLE: Readonly<
  Record<MembershipRoleCode, SystemRole>
> = {
  WORKSPACE_OWNER: "workspace_owner",
  AGENCY_ADMIN: "agency_admin",
  BRANCH_MANAGER: "branch_manager",
  NEGOTIATOR: "negotiator",
  PROPERTY_MANAGER: "property_manager",
  ACCOUNTS: "accounts",
  READ_ONLY: "read_only",
};

export const SYSTEM_ROLE_TO_DATABASE_ROLE: Readonly<
  Record<SystemRole, MembershipRoleCode>
> = {
  workspace_owner: "WORKSPACE_OWNER",
  agency_admin: "AGENCY_ADMIN",
  branch_manager: "BRANCH_MANAGER",
  negotiator: "NEGOTIATOR",
  property_manager: "PROPERTY_MANAGER",
  accounts: "ACCOUNTS",
  read_only: "READ_ONLY",
};

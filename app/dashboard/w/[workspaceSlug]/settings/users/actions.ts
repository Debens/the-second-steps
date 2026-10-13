"use server";

import { revalidatePath } from "next/cache";
import { updateWorkspaceMemberRoles } from "@/core/access/application/workspace-members";
import { requireMfaUser } from "@/core/auth/mfa";

export type UpdateRolesState = {
  status: "idle" | "success" | "error";
  message: string;
};

const ERROR_MESSAGES = {
  access_denied: "You do not have permission to change these roles.",
  cannot_manage_roles: "You cannot grant one or more of those roles.",
  invalid_input: "The submitted role selection was not valid.",
  invalid_role_combination: "Read Only cannot be combined with another role.",
  last_active_owner: "The final Account Owner cannot be removed.",
  member_not_found: "That team member is no longer available.",
  owner_role_requires_owner:
    "Only an Account Owner can appoint or remove another Account Owner.",
  self_role_change:
    "You cannot change your own roles. Ask another Account Owner.",
} as const;

export async function updateMemberRolesAction(
  workspaceSlug: string,
  membershipId: string,
  _previousState: UpdateRolesState,
  formData: FormData,
): Promise<UpdateRolesState> {
  const path = `/dashboard/w/${workspaceSlug}/settings/users`;
  const user = await requireMfaUser(path, { workspaceSlug });
  const roles = formData
    .getAll("roles")
    .filter((value): value is string => typeof value === "string");
  const result = await updateWorkspaceMemberRoles({
    authSubject: user.id,
    workspaceSlug,
    targetMembershipId: membershipId,
    proposedRoleValues: roles,
  });

  if (!result.ok) {
    return { status: "error", message: ERROR_MESSAGES[result.error] };
  }

  revalidatePath(path);
  return { status: "success", message: "Roles updated." };
}

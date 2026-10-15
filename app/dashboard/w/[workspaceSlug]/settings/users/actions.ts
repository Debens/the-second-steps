"use server";

import { revalidatePath } from "next/cache";
import { updateWorkspaceMemberAccess } from "@/core/access/application/workspace-member-access";
import { requireMfaUser } from "@/core/auth/mfa";

export type UpdateAccessState = {
  status: "idle" | "success" | "error";
  message: string;
};

const ERROR_MESSAGES = {
  access_denied: "You do not have permission to change these roles.",
  cannot_manage_scope: "You do not have permission to change branch access.",
  cannot_manage_roles: "You cannot grant one or more of those roles.",
  invalid_input: "The submitted role selection was not valid.",
  invalid_branch: "Choose active branches available to you.",
  invalid_scope: "Choose All branches or at least one named branch.",
  invalid_role_combination: "Read Only cannot be combined with another role.",
  last_active_owner: "The final Account Owner cannot be removed.",
  member_not_found: "That team member is no longer available.",
  owner_role_requires_owner:
    "Only an Account Owner can appoint or remove another Account Owner.",
  self_role_change:
    "You cannot change your own roles. Ask another Account Owner.",
  owner_scope_requires_owner:
    "Only an Account Owner can change another Account Owner's branch access.",
  self_scope_change:
    "You cannot change your own branch access. Ask another Account Owner or Agency Admin.",
} as const;

export async function updateMemberAccessAction(
  workspaceSlug: string,
  membershipId: string,
  _previousState: UpdateAccessState,
  formData: FormData,
): Promise<UpdateAccessState> {
  const path = `/dashboard/w/${workspaceSlug}/settings/users`;
  const user = await requireMfaUser(path, { workspaceSlug });
  const roles = formData
    .getAll("roles")
    .filter((value): value is string => typeof value === "string");
  const scopeMode = formData.get("scopeMode");
  if (scopeMode !== "workspace" && scopeMode !== "named_branches") {
    return { status: "error", message: ERROR_MESSAGES.invalid_input };
  }
  const branchIds = formData
    .getAll("branchIds")
    .filter((value): value is string => typeof value === "string");
  const result = await updateWorkspaceMemberAccess({
    authSubject: user.id,
    workspaceSlug,
    targetMembershipId: membershipId,
    proposedRoleValues: roles,
    proposedScope:
      scopeMode === "workspace"
        ? { kind: "workspace" }
        : { kind: "named_branches", branchIds },
  });

  if (!result.ok) {
    return { status: "error", message: ERROR_MESSAGES[result.error] };
  }

  revalidatePath(path);
  revalidatePath(`/dashboard/w/${workspaceSlug}/settings/branches`);
  return { status: "success", message: "User access updated." };
}

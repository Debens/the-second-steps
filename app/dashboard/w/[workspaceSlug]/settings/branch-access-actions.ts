"use server";

import { revalidatePath } from "next/cache";
import { updateWorkspaceMemberScope } from "@/core/access/application/workspace-member-scope";
import { requireMfaUser } from "@/core/auth/mfa";

export type UpdateScopeState = {
  status: "idle" | "success" | "error";
  message: string;
};

const ERROR_MESSAGES = {
  access_denied: "You do not have permission to change branch access.",
  cannot_manage_scope: "You do not have permission to change branch access.",
  invalid_branch: "Choose active branches available to you.",
  invalid_input: "The submitted branch access was not valid.",
  invalid_scope: "Choose All branches or at least one named branch.",
  member_not_found: "That active user is no longer available.",
  owner_scope_requires_owner:
    "Only an Account Owner can change another Account Owner's branch access.",
  self_scope_change:
    "You cannot change your own branch access. Ask another Account Owner or Agency Admin.",
} as const;

export async function updateMemberScopeAction(
  workspaceSlug: string,
  membershipId: string,
  _previousState: UpdateScopeState,
  formData: FormData,
): Promise<UpdateScopeState> {
  const usersPath = `/dashboard/w/${workspaceSlug}/settings/users`;
  const user = await requireMfaUser(usersPath, { workspaceSlug });
  const scopeMode = formData.get("scopeMode");
  if (scopeMode !== "workspace" && scopeMode !== "named_branches") {
    return { status: "error", message: ERROR_MESSAGES.invalid_input };
  }
  const branchIds = formData
    .getAll("branchIds")
    .filter((value): value is string => typeof value === "string");
  const proposedScope =
    scopeMode === "workspace"
      ? ({ kind: "workspace" } as const)
      : ({ kind: "named_branches", branchIds } as const);
  const result = await updateWorkspaceMemberScope({
    authSubject: user.id,
    workspaceSlug,
    targetMembershipId: membershipId,
    proposedScope,
  });

  if (!result.ok) {
    return { status: "error", message: ERROR_MESSAGES[result.error] };
  }

  revalidatePath(usersPath);
  revalidatePath(`/dashboard/w/${workspaceSlug}/settings/branches`);
  return { status: "success", message: "Branch access updated." };
}

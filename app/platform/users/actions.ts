"use server";

import { revalidatePath } from "next/cache";
import { requireMfaUser } from "@/core/auth/mfa";
import { updatePlatformUserName } from "@/core/platform/application/platform-user-management";

export type UpdateUserProfileState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: { firstName?: string; lastName?: string };
};

export async function updateUserNameAction(
  targetUserIdentityId: string,
  _previousState: UpdateUserProfileState,
  formData: FormData,
): Promise<UpdateUserProfileState> {
  const path = "/platform/users";
  const user = await requireMfaUser(path);
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");

  if (typeof firstName !== "string" || typeof lastName !== "string") {
    return {
      status: "error",
      message: "Enter a first name and last name.",
    };
  }

  const result = await updatePlatformUserName({
    authSubject: user.id,
    targetUserIdentityId,
    firstName,
    lastName,
  });

  if (!result.ok) {
    const messages = {
      access_denied: "You do not have permission to edit this user.",
      invalid_input:
        "Enter a first name and last name of up to 100 characters each.",
      user_not_found: "That user is no longer available.",
    } as const;
    return {
      status: "error",
      message: messages[result.error],
      fieldErrors:
        result.error === "invalid_input"
          ? {
              firstName: messages.invalid_input,
              lastName: messages.invalid_input,
            }
          : undefined,
    };
  }

  revalidatePath(path);
  return { status: "success", message: "Name saved." };
}

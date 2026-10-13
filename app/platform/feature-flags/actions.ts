"use server";

import { revalidatePath } from "next/cache";
import { requireMfaUser } from "@/core/auth/mfa";
import { updateFeatureFlagSettings } from "@/core/feature-flags/application/manage-feature-flags";
import { isFeatureFlagKey } from "@/core/feature-flags/domain/feature-flag";

export type FeatureFlagFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function updateFeatureFlagAction(
  _previousState: FeatureFlagFormState,
  formData: FormData,
): Promise<FeatureFlagFormState> {
  const path = "/platform/feature-flags";
  const user = await requireMfaUser(path);
  const key = formData.get("key");
  if (typeof key !== "string" || !isFeatureFlagKey(key)) {
    return { status: "error", message: "That feature flag was not valid." };
  }

  const result = await updateFeatureFlagSettings({
    authSubject: user.id,
    key,
    globalEnabled: formData.get("globalEnabled") === "on",
    zaytoUsersEnabled: formData.get("zaytoUsersEnabled") === "on",
  });

  if (!result.ok) {
    const messages = {
      access_denied: "You do not have permission to change feature flags.",
      flag_not_found: "That feature flag is no longer available.",
      release_protected:
        "Staff 2FA is protected for release and cannot be switched off here.",
    } as const;
    return { status: "error", message: messages[result.error] };
  }

  revalidatePath(path);
  return { status: "success", message: "Feature flag settings saved." };
}

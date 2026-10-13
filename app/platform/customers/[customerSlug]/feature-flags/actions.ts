"use server";

import { revalidatePath } from "next/cache";
import { requireMfaUser } from "@/core/auth/mfa";
import { isFeatureFlagKey } from "@/core/feature-flags/domain/feature-flag";
import {
  updateCustomerFeatureFlagOverride,
  type CustomerFeatureFlagOverrideMode,
} from "@/core/platform/application/customer-feature-flags";

export type CustomerFeatureFlagFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

const CUSTOMER_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isOverrideMode(
  value: FormDataEntryValue | null,
): value is CustomerFeatureFlagOverrideMode {
  return value === "inherit" || value === "enabled" || value === "disabled";
}

export async function updateCustomerFeatureFlagAction(
  _previousState: CustomerFeatureFlagFormState,
  formData: FormData,
): Promise<CustomerFeatureFlagFormState> {
  const customerSlug = formData.get("customerSlug");
  const key = formData.get("key");
  const mode = formData.get("mode");

  if (
    typeof customerSlug !== "string" ||
    customerSlug.length > 63 ||
    !CUSTOMER_SLUG_PATTERN.test(customerSlug) ||
    typeof key !== "string" ||
    !isFeatureFlagKey(key) ||
    !isOverrideMode(mode)
  ) {
    return {
      status: "error",
      message: "Those feature flag settings were invalid.",
    };
  }

  const path = `/platform/customers/${customerSlug}/feature-flags`;
  const user = await requireMfaUser(path);
  const result = await updateCustomerFeatureFlagOverride({
    authSubject: user.id,
    customerSlug,
    key,
    mode,
  });

  if (!result.ok) {
    const messages = {
      access_denied: "You do not have permission to change this feature flag.",
      customer_not_found: "That customer is no longer available.",
      flag_not_found: "That feature flag is no longer available.",
      release_protected:
        "Staff two-step verification is protected for release and cannot be forced off.",
    } as const;
    return { status: "error", message: messages[result.error] };
  }

  revalidatePath(path);
  return { status: "success", message: "Customer feature flag saved." };
}

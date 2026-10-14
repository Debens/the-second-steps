"use server";

import { revalidatePath } from "next/cache";
import { requireMfaUser } from "@/core/auth/mfa";
import {
  updateWorkspaceCustomerDetails,
  type CustomerDetailsFormState,
} from "@/core/workspace/application/workspace-details";
import {
  CUSTOMER_DETAIL_FIELDS,
  type CustomerDetailsInput,
} from "@/core/workspace/domain/customer-details";

function detailsFromFormData(formData: FormData): CustomerDetailsInput | null {
  const entries = CUSTOMER_DETAIL_FIELDS.map((field) => [
    field,
    formData.get(field),
  ]);
  if (entries.some(([, value]) => typeof value !== "string")) return null;
  return Object.fromEntries(entries) as CustomerDetailsInput;
}

export async function updateWorkspaceCustomerDetailsAction(
  workspaceSlug: string,
  _previousState: CustomerDetailsFormState,
  formData: FormData,
): Promise<CustomerDetailsFormState> {
  const path = `/dashboard/w/${workspaceSlug}/settings`;
  const user = await requireMfaUser(path, { workspaceSlug });
  const details = detailsFromFormData(formData);
  if (!details) {
    return {
      status: "error",
      message: "The submitted customer details were incomplete.",
    };
  }

  const result = await updateWorkspaceCustomerDetails({
    authSubject: user.id,
    workspaceSlug,
    details,
  });
  if (!result.ok) {
    const messages = {
      access_denied: "You do not have permission to edit these details.",
      customer_not_found: "This customer workspace is no longer available.",
      invalid_input: "Review the highlighted customer details.",
    } as const;
    return {
      status: "error",
      message: messages[result.error],
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(`/dashboard/w/${workspaceSlug}`, "layout");
  revalidatePath(`/platform/customers/${workspaceSlug}`, "layout");
  revalidatePath("/platform/customers");
  return { status: "success", message: "Details saved." };
}

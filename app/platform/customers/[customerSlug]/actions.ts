"use server";

import { revalidatePath } from "next/cache";
import { requireMfaUser } from "@/core/auth/mfa";
import {
  updatePlatformCustomerDetails,
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

export async function updatePlatformCustomerDetailsAction(
  customerSlug: string,
  _previousState: CustomerDetailsFormState,
  formData: FormData,
): Promise<CustomerDetailsFormState> {
  const path = `/platform/customers/${customerSlug}`;
  const user = await requireMfaUser(path);
  const details = detailsFromFormData(formData);
  if (!details) {
    return {
      status: "error",
      message: "The submitted customer details were incomplete.",
    };
  }

  const result = await updatePlatformCustomerDetails({
    authSubject: user.id,
    customerSlug,
    details,
  });
  if (!result.ok) {
    const messages = {
      access_denied: "You do not have permission to edit this customer.",
      customer_not_found: "That customer is no longer available.",
      invalid_input: "Review the highlighted customer details.",
    } as const;
    return {
      status: "error",
      message: messages[result.error],
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/platform/customers");
  revalidatePath(path, "layout");
  revalidatePath(`/dashboard/w/${customerSlug}`, "layout");
  return { status: "success", message: "Details saved." };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireMfaUser } from "@/core/auth/mfa";
import {
  addEnquiryListItem,
  updateEnquiryListItem,
} from "@/core/enquiries/application/enquiry-lists";
import { isUuid } from "@/core/properties/domain/ids";

export type EnquiryListState = {
  status: "idle" | "error" | "saved";
  message: string;
};

function value(formData: FormData, name: string) {
  const raw = formData.get(name);
  return typeof raw === "string" ? raw : "";
}

function message(error: string) {
  if (error === "access_denied")
    return "You do not have permission to manage these lists.";
  if (error === "invalid_input") return "Check the list item and try again.";
  return "That list item is no longer available. Refresh the page and try again.";
}

export async function addEnquiryListItemAction(
  workspaceSlug: string,
  _state: EnquiryListState,
  formData: FormData,
): Promise<EnquiryListState> {
  const path = `/dashboard/w/${workspaceSlug}/settings/enquiries`;
  const user = await requireMfaUser(path, { workspaceSlug });
  const kind = value(formData, "kind");
  const appliesTo = value(formData, "appliesTo");
  if (kind !== "lead_source" && kind !== "outcome_reason")
    return { status: "error", message: "Choose a valid list." };
  if (
    kind === "outcome_reason" &&
    !["lost", "postponed", "both"].includes(appliesTo)
  )
    return { status: "error", message: "Choose when the reason applies." };
  const result = await addEnquiryListItem({
    authSubject: user.id,
    workspaceSlug,
    kind,
    name: value(formData, "name"),
    ...(kind === "outcome_reason"
      ? { appliesTo: appliesTo as "lost" | "postponed" | "both" }
      : {}),
  });
  if (!result.ok) return { status: "error", message: message(result.error) };
  revalidatePath(path);
  return { status: "saved", message: "List item added." };
}

export async function updateEnquiryListItemAction(
  workspaceSlug: string,
  _state: EnquiryListState,
  formData: FormData,
): Promise<EnquiryListState> {
  const path = `/dashboard/w/${workspaceSlug}/settings/enquiries`;
  const user = await requireMfaUser(path, { workspaceSlug });
  const kind = value(formData, "kind");
  const itemId = value(formData, "itemId");
  const sortOrder = Number(value(formData, "sortOrder"));
  if (
    (kind !== "lead_source" && kind !== "outcome_reason") ||
    !isUuid(itemId) ||
    !Number.isInteger(sortOrder)
  )
    return { status: "error", message: "Check the list item and try again." };
  const result = await updateEnquiryListItem({
    authSubject: user.id,
    workspaceSlug,
    kind,
    itemId,
    name: value(formData, "name"),
    hidden: formData.get("hidden") === "on",
    sortOrder,
  });
  if (!result.ok) return { status: "error", message: message(result.error) };
  revalidatePath(path);
  return { status: "saved", message: "List item saved." };
}

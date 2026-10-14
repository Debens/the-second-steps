import { redirect } from "next/navigation";
import { CustomerDetailsEditor } from "@/components/workspace/customer-details-editor";
import { requireMfaUser } from "@/core/auth/mfa";
import { getWorkspaceCustomerDetails } from "@/core/workspace/application/workspace-details";
import { updateWorkspaceCustomerDetailsAction } from "./actions";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const path = `/dashboard/w/${workspaceSlug}/settings`;
  const user = await requireMfaUser(path, { workspaceSlug });
  const result = await getWorkspaceCustomerDetails(user.id, workspaceSlug);
  if (!result) redirect("/access-denied");
  const { details, canEdit } = result;

  return (
    <CustomerDetailsEditor
      action={updateWorkspaceCustomerDetailsAction.bind(null, workspaceSlug)}
      canEdit={canEdit}
      details={details}
      typeLabel={
        details.type === "AGENCY" ? "Letting agency" : "Independent landlord"
      }
    />
  );
}

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateEnquiryAction } from "../../actions";
import { EditEnquiryForm } from "@/components/enquiries/edit-enquiry-form";
import { Button } from "@/components/ui/button";
import { getWorkspaceAccessContext } from "@/core/access/application/access-context";
import { requireMfaUser } from "@/core/auth/mfa";
import { listEnquirySettings } from "@/core/enquiries/application/enquiry-lists";
import {
  getEnquiry,
  listEnquiryAssignees,
} from "@/core/enquiries/application/enquiries";
import { staffName } from "@/core/enquiries/application/enquiry-shared";
import {
  isOpenStage,
  type EnquiryStageCode,
} from "@/core/enquiries/domain/enquiry";
import { isUuid } from "@/core/properties/domain/ids";

export default async function EditEnquiryPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; enquiryId: string }>;
}) {
  const { workspaceSlug, enquiryId } = await params;
  if (!isUuid(enquiryId)) notFound();
  const recordPath = `/dashboard/w/${workspaceSlug}/enquiries/${enquiryId}`;
  const path = `${recordPath}/edit`;
  const user = await requireMfaUser(path, { workspaceSlug });
  const [enquiry, context, settings, allAssignees] = await Promise.all([
    getEnquiry({ authSubject: user.id, workspaceSlug, enquiryId }),
    getWorkspaceAccessContext(user.id, workspaceSlug),
    listEnquirySettings({ authSubject: user.id, workspaceSlug }),
    listEnquiryAssignees({ authSubject: user.id, workspaceSlug }),
  ]);
  if (!context || !settings || !context.permissions.has("enquiry.update")) {
    redirect("/access-denied");
  }
  if (!enquiry) notFound();
  const stage = enquiry.stage.toLowerCase() as EnquiryStageCode;
  if (!isOpenStage(stage)) redirect(recordPath);

  const leadSources = settings.leadSources
    .filter(
      ({ id, status }) => status === "active" || id === enquiry.leadSourceId,
    )
    .map(({ id, name, status }) => ({
      value: id,
      label: status === "hidden" ? `${name} (hidden)` : name,
    }));
  const assignees = allAssignees
    .filter(
      ({ branchIds }) =>
        branchIds === null || branchIds.includes(enquiry.responsibleBranchId),
    )
    .map(({ membershipId, name }) => ({ value: membershipId, label: name }));
  if (
    enquiry.leadMembership &&
    !assignees.some(({ value }) => value === enquiry.leadMembershipId)
  ) {
    assignees.push({
      value: enquiry.leadMembership.id,
      label: `${staffName(enquiry.leadMembership.userIdentity)} (current)`,
    });
  }

  return (
    <div className="grid gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        render={<Link href={recordPath} />}
        nativeButton={false}
      >
        <ArrowLeft aria-hidden="true" />
        Back to landlord lead
      </Button>
      <div>
        <p className="text-sm font-medium text-primary">{enquiry.reference}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit landlord lead
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Correct the lead details and responsibility in one reviewed save.
        </p>
      </div>
      <EditEnquiryForm
        action={updateEnquiryAction.bind(null, workspaceSlug, enquiryId)}
        cancelPath={recordPath}
        responsibleBranch={enquiry.responsibleBranch.name}
        hasLinkedContact={Boolean(enquiry.contactId)}
        hasLinkedProperty={Boolean(enquiry.propertyId)}
        initial={{
          name: enquiry.enquirerName,
          email: enquiry.enquirerEmail ?? "",
          telephone: enquiry.enquirerTelephone ?? "",
          addressBuilding: enquiry.addressBuilding ?? "",
          addressStreet: enquiry.addressStreet ?? "",
          postcode: enquiry.postcode ?? "",
          summary: enquiry.summary ?? "",
          leadSourceId: enquiry.leadSourceId ?? "",
          leadMembershipId: enquiry.leadMembershipId ?? "",
        }}
        leadSources={leadSources}
        assignees={assignees}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { CustomerDetailsEditor } from "@/components/workspace/customer-details-editor";
import { requireMfaUser } from "@/core/auth/mfa";
import { getCustomerProfile } from "@/core/platform/application/platform-directory";
import { updatePlatformCustomerDetailsAction } from "./actions";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Europe/London",
});

export default async function CustomerOverviewPage({
  params,
}: {
  params: Promise<{ customerSlug: string }>;
}) {
  const { customerSlug } = await params;
  const path = `/platform/customers/${customerSlug}`;
  const user = await requireMfaUser(path);
  const customer = await getCustomerProfile(user.id, customerSlug);
  if (!customer) notFound();

  return (
    <CustomerDetailsEditor
      action={updatePlatformCustomerDetailsAction.bind(null, customerSlug)}
      details={customer}
      typeLabel={
        customer.type === "AGENCY" ? "Letting agency" : "Independent landlord"
      }
      createdAtLabel={DATE_FORMAT.format(customer.createdAt)}
    />
  );
}

import { Building2, CalendarDays, Globe2, Mail, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireMfaUser } from "@/core/auth/mfa";
import { getCustomerProfile } from "@/core/platform/application/platform-directory";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Europe/London",
});

function TextValue({ children }: { children: React.ReactNode }) {
  return (
    <dd className="mt-1 text-sm font-medium">{children || "Not recorded"}</dd>
  );
}

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

  const address = [
    customer.registeredAddress1,
    customer.registeredAddress2,
    customer.registeredTownCity,
    customer.registeredCounty,
    customer.registeredPostcode,
  ].filter(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <Building2 aria-hidden="true" className="size-5 text-primary" />
          <CardTitle>Company details</CardTitle>
          <CardDescription>
            Read-only legal and customer-account information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Trading name</dt>
              <TextValue>{customer.displayName}</TextValue>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Legal name</dt>
              <TextValue>{customer.legalName}</TextValue>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Companies House number
              </dt>
              <TextValue>{customer.companyNumber}</TextValue>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Customer type</dt>
              <TextValue>
                {customer.type === "AGENCY"
                  ? "Letting agency"
                  : "Independent landlord"}
              </TextValue>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays aria-hidden="true" className="size-3.5" /> Date
                added
              </dt>
              <TextValue>{DATE_FORMAT.format(customer.createdAt)}</TextValue>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Mail aria-hidden="true" className="size-5 text-primary" />
          <CardTitle>Contact details</CardTitle>
          <CardDescription>
            Primary customer contact information and registered address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail aria-hidden="true" className="size-3.5" /> Email
              </dt>
              <TextValue>{customer.primaryEmail}</TextValue>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone aria-hidden="true" className="size-3.5" /> Telephone
              </dt>
              <TextValue>{customer.telephone}</TextValue>
            </div>
            <div className="sm:col-span-2">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <Globe2 aria-hidden="true" className="size-3.5" /> Website
              </dt>
              <TextValue>{customer.website}</TextValue>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">
                Registered address
              </dt>
              <TextValue>
                {address.length > 0 ? address.join(", ") : null}
              </TextValue>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

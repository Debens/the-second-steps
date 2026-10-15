import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireMfaUser } from "@/core/auth/mfa";
import { getCustomerProfile } from "@/core/platform/application/platform-directory";
import { CustomerTabs } from "./customer-tabs";

function customerStatus(status: "ACTIVE" | "SUSPENDED" | "CLOSED") {
  if (status === "ACTIVE") return { label: "Active", tone: "active" as const };
  if (status === "SUSPENDED") {
    return { label: "Suspended", tone: "suspended" as const };
  }
  return { label: "Former customer", tone: "closed" as const };
}

export default async function CustomerProfileLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ customerSlug: string }>;
}>) {
  const { customerSlug } = await params;
  const path = `/platform/customers/${customerSlug}`;
  const user = await requireMfaUser(path);
  const customer = await getCustomerProfile(user.id, customerSlug);
  if (!customer) notFound();

  return (
    <div className="grid max-w-6xl gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Customer profile</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {customer.displayName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {customer.type === "AGENCY"
              ? "Letting agency"
              : "Independent landlord"}
          </p>
        </div>
        <StatusBadge {...customerStatus(customer.status)} />
      </div>

      <CustomerTabs customerSlug={customerSlug} />
      {children}
    </div>
  );
}

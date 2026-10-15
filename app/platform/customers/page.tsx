import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireMfaUser } from "@/core/auth/mfa";
import { listCustomers } from "@/core/platform/application/platform-directory";
import { PlatformSearchForm } from "../search-form";

export const metadata: Metadata = {
  title: "Customers | Zayto",
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/London",
});

function firstSearchValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value.slice(0, 100) : "";
}

function customerStatus(status: "ACTIVE" | "SUSPENDED" | "CLOSED") {
  if (status === "ACTIVE") return { label: "Active", tone: "active" as const };
  if (status === "SUSPENDED") {
    return { label: "Suspended", tone: "suspended" as const };
  }
  return { label: "Former customer", tone: "closed" as const };
}

function customerType(type: "AGENCY" | "LANDLORD") {
  return type === "AGENCY" ? "Letting agency" : "Independent landlord";
}

export default async function PlatformCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const path = "/platform/customers";
  const user = await requireMfaUser(path);
  const query = firstSearchValue((await searchParams).q);
  const customers = await listCustomers(user.id, query);
  if (!customers) redirect("/access-denied");

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Customer accounts</p>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Read-only customer, branch and membership summaries. Subscription
          status will remain separate when commercial plans are introduced.
        </p>
      </div>

      <Card>
        <CardContent>
          <PlatformSearchForm
            action={path}
            defaultValue={query}
            label="Search customers"
            placeholder="Search by trading or legal name"
          />
        </CardContent>
      </Card>

      {customers.length === 0 ? (
        <Card>
          <CardHeader>
            <Building2 aria-hidden="true" className="size-5 text-primary" />
            <CardTitle>No customers found</CardTitle>
            <CardDescription>
              {query
                ? "Try another trading or legal name."
                : "No customer workspaces have been created yet."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:hidden">
            {customers.map((customer) => {
              const status = customerStatus(customer.status);
              return (
                <Card key={customer.id}>
                  <CardHeader>
                    <CardTitle>
                      <Link
                        href={`/platform/customers/${customer.slug}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {customer.displayName}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {customerType(customer.type)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <StatusBadge {...status} />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Branches
                        </p>
                        <p className="font-medium">
                          {customer.activeBranchCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Users</p>
                        <p className="font-medium">
                          {customer.activeUserCount}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Added {DATE_FORMAT.format(customer.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="hidden md:block">
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Branches</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Date added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => {
                    const status = customerStatus(customer.status);
                    return (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/platform/customers/${customer.slug}`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {customer.displayName}
                          </Link>
                        </TableCell>
                        <TableCell>{customerType(customer.type)}</TableCell>
                        <TableCell>
                          <StatusBadge {...status} />
                        </TableCell>
                        <TableCell>{customer.activeBranchCount}</TableCell>
                        <TableCell>{customer.activeUserCount}</TableCell>
                        <TableCell>
                          {DATE_FORMAT.format(customer.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

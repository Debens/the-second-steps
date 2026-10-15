import { UserRoundSearch } from "lucide-react";
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
import { ROLE_LABELS } from "@/core/access/domain/role";
import { requireMfaUser } from "@/core/auth/mfa";
import {
  listPlatformUsers,
  type PlatformUserSummary,
} from "@/core/platform/application/platform-directory";
import { formatPersonName } from "@/core/platform/domain/user-profile";
import { PlatformSearchForm } from "../search-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { UserDetailsDialog } from "./user-details-dialog";

export const metadata: Metadata = {
  title: "Users | Zayto",
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

function AccessSummary({ user }: { user: PlatformUserSummary }) {
  const activeMemberships = user.memberships.filter(
    (membership) => membership.status === "ACTIVE",
  );

  if (!user.isPlatformOwner && activeMemberships.length === 0) {
    return <span className="text-muted-foreground">No active access</span>;
  }

  return (
    <div className="grid gap-1">
      {user.isPlatformOwner && <span>Zayto Platform Owner</span>}
      {activeMemberships.map((membership) => (
        <span key={membership.id}>
          {membership.roles.map((role) => ROLE_LABELS[role]).join(", ")}
        </span>
      ))}
    </div>
  );
}

function CustomerMemberships({ user }: { user: PlatformUserSummary }) {
  if (user.memberships.length === 0) {
    return <span className="text-muted-foreground">None</span>;
  }

  return (
    <div className="grid gap-1">
      {user.memberships.map((membership) => (
        <Link
          key={membership.id}
          href={`/platform/customers/${membership.customer.slug}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {membership.customer.displayName}
        </Link>
      ))}
    </div>
  );
}

export default async function PlatformUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const path = "/platform/users";
  const user = await requireMfaUser(path);
  const query = firstSearchValue((await searchParams).q);
  const users = await listPlatformUsers(user.id, query);
  if (!users) redirect("/access-denied");

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Platform access</p>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          View Zayto identities, update account details, and review their
          current platform or customer access.
        </p>
      </div>

      <Card>
        <CardContent>
          <PlatformSearchForm
            action={path}
            defaultValue={query}
            label="Search users"
            placeholder="Search by name or email address"
          />
        </CardContent>
      </Card>

      {users.length === 0 ? (
        <Card>
          <CardHeader>
            <UserRoundSearch
              aria-hidden="true"
              className="size-5 text-primary"
            />
            <CardTitle>No users found</CardTitle>
            <CardDescription>
              {query
                ? "Try another name or email address."
                : "No user identities have been provisioned yet."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:hidden">
            {users.map((directoryUser) => (
              <Card key={directoryUser.id}>
                <CardHeader>
                  <CardTitle>
                    {formatPersonName(
                      directoryUser.firstName,
                      directoryUser.lastName,
                    )}
                  </CardTitle>
                  <CardDescription>
                    {directoryUser.primaryEmail ?? "Email not recorded"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <StatusBadge
                    label={
                      directoryUser.status === "ACTIVE" ? "Active" : "Suspended"
                    }
                    tone={
                      directoryUser.status === "ACTIVE" ? "active" : "suspended"
                    }
                  />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Access
                    </p>
                    <AccessSummary user={directoryUser} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Customers
                    </p>
                    <CustomerMemberships user={directoryUser} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Added {DATE_FORMAT.format(directoryUser.createdAt)}
                  </p>
                  <UserDetailsDialog
                    user={directoryUser}
                    createdAtLabel={DATE_FORMAT.format(directoryUser.createdAt)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hidden py-0 md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Customers</TableHead>
                    <TableHead>Date added</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((directoryUser) => (
                    <TableRow key={directoryUser.id}>
                      <TableCell className="font-medium">
                        {formatPersonName(
                          directoryUser.firstName,
                          directoryUser.lastName,
                        )}
                      </TableCell>
                      <TableCell>
                        {directoryUser.primaryEmail ?? "Not recorded"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={
                            directoryUser.status === "ACTIVE"
                              ? "Active"
                              : "Suspended"
                          }
                          tone={
                            directoryUser.status === "ACTIVE"
                              ? "active"
                              : "suspended"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <AccessSummary user={directoryUser} />
                      </TableCell>
                      <TableCell>
                        <CustomerMemberships user={directoryUser} />
                      </TableCell>
                      <TableCell>
                        {DATE_FORMAT.format(directoryUser.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <UserDetailsDialog
                          user={directoryUser}
                          createdAtLabel={DATE_FORMAT.format(
                            directoryUser.createdAt,
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

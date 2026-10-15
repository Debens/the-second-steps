import { UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import { ROLE_LABELS } from "@/core/access/domain/role";
import { requireMfaUser } from "@/core/auth/mfa";
import {
  listCustomerUsers,
  type CustomerUserSummary,
} from "@/core/platform/application/platform-directory";
import { formatPersonName } from "@/core/platform/domain/user-profile";

function membershipStatus(status: CustomerUserSummary["status"]) {
  if (status === "ACTIVE") return { label: "Active", tone: "active" as const };
  if (status === "SUSPENDED") {
    return { label: "Suspended", tone: "suspended" as const };
  }
  return { label: "Ended", tone: "closed" as const };
}

function RoleSummary({ user }: { user: CustomerUserSummary }) {
  return (
    <div className="flex flex-wrap gap-2">
      {user.roles.map((role) => (
        <Badge key={role} variant="secondary">
          {ROLE_LABELS[role]}
        </Badge>
      ))}
    </div>
  );
}

function ScopeSummary({ user }: { user: CustomerUserSummary }) {
  if (user.scopeMode === "WORKSPACE") {
    return <Badge variant="info">All branches</Badge>;
  }

  if (user.branches.length === 0) {
    return <Badge variant="warning">No named branches</Badge>;
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      {user.branches.map((branch) => (
        <Badge key={branch.id} variant="outline">
          {branch.name}
          {branch.status === "INACTIVE" ? " (inactive)" : ""}
        </Badge>
      ))}
    </span>
  );
}

export default async function CustomerUsersPage({
  params,
}: {
  params: Promise<{ customerSlug: string }>;
}) {
  const { customerSlug } = await params;
  const path = `/platform/customers/${customerSlug}/users`;
  const user = await requireMfaUser(path);
  const users = await listCustomerUsers(user.id, customerSlug);
  if (!users) notFound();

  if (users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <UsersRound aria-hidden="true" className="size-5 text-primary" />
          <CardTitle>No users</CardTitle>
          <CardDescription>
            This customer does not have any membership records yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:hidden">
        {users.map((customerUser) => (
          <Card key={customerUser.id}>
            <CardHeader>
              <CardTitle>
                {formatPersonName(
                  customerUser.firstName,
                  customerUser.lastName,
                )}
              </CardTitle>
              <CardDescription>
                {customerUser.primaryEmail ?? "Email not recorded"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <StatusBadge {...membershipStatus(customerUser.status)} />
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Roles
                </p>
                <RoleSummary user={customerUser} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Branch access
                </p>
                <p className="mt-1 text-sm">
                  <ScopeSummary user={customerUser} />
                </p>
              </div>
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
                <TableHead>Roles</TableHead>
                <TableHead>Branch access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((customerUser) => (
                <TableRow key={customerUser.id}>
                  <TableCell className="font-medium">
                    {formatPersonName(
                      customerUser.firstName,
                      customerUser.lastName,
                    )}
                  </TableCell>
                  <TableCell>
                    {customerUser.primaryEmail ?? "Not recorded"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge {...membershipStatus(customerUser.status)} />
                  </TableCell>
                  <TableCell>
                    <RoleSummary user={customerUser} />
                  </TableCell>
                  <TableCell className="max-w-72">
                    <ScopeSummary user={customerUser} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

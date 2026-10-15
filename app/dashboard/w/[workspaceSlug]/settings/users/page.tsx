import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getWorkspaceMembers } from "@/core/access/application/workspace-members";
import { ROLE_LABELS } from "@/core/access/domain/role";
import { requireMfaUser } from "@/core/auth/mfa";
import { UserAccessForm } from "./role-form";

export default async function WorkspaceUsersPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const path = `/dashboard/w/${workspaceSlug}/settings/users`;
  const user = await requireMfaUser(path, { workspaceSlug });
  const result = await getWorkspaceMembers(user.id, workspaceSlug);
  if (!result) redirect("/access-denied");

  const rows = result.members.map((member, index) => {
    const recordedName = [member.firstName, member.lastName]
      .filter(Boolean)
      .join(" ");
    const userLabel =
      recordedName ||
      member.primaryEmail ||
      `Unnamed user ${String(index + 1).padStart(2, "0")}`;
    const canEdit =
      member.status === "ACTIVE" &&
      ((result.canManageRoles && !member.isCurrentUser) ||
        member.canManageScope);
    const status = (
      <StatusBadge
        label={
          member.status === "ACTIVE"
            ? "Active"
            : member.status === "SUSPENDED"
              ? "Suspended"
              : "Ended"
        }
        tone={
          member.status === "ACTIVE"
            ? "active"
            : member.status === "SUSPENDED"
              ? "suspended"
              : "closed"
        }
      />
    );
    const access = (
      <div className="flex flex-wrap gap-2">
        <Badge variant={member.scopeMode === "WORKSPACE" ? "info" : "outline"}>
          {member.scopeMode === "WORKSPACE"
            ? "All branches"
            : `${member.branchCount} named branch${member.branchCount === 1 ? "" : "es"}`}
        </Badge>
        {member.roles.map((role) => (
          <Badge key={role} variant="secondary">
            {ROLE_LABELS[role]}
          </Badge>
        ))}
      </div>
    );
    const editor = canEdit ? (
      <UserAccessForm
        branches={result.activeBranches}
        branchIds={member.branchIds}
        membershipId={member.id}
        roles={member.roles}
        scopeMode={member.scopeMode}
        userLabel={userLabel}
        workspaceSlug={workspaceSlug}
      />
    ) : null;
    return {
      id: member.id,
      userLabel,
      email: `${member.primaryEmail ?? "No email recorded"}${
        member.isCurrentUser ? " · You" : ""
      }`,
      status,
      access,
      editor,
    };
  });

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-lg font-semibold">Users &amp; access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review each user’s access and edit their roles from one place.
        </p>
      </div>

      <div className="grid gap-4 md:hidden">
        {rows.map((row) => (
          <Card key={row.id} data-user-row>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {row.userLabel}
                {row.status}
              </CardTitle>
              <CardDescription>{row.email}</CardDescription>
              {row.editor ? <CardAction>{row.editor}</CardAction> : null}
            </CardHeader>
            <CardContent>{row.access}</CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden md:block">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} data-user-row>
                  <TableCell className="font-medium">{row.userLabel}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.email}
                  </TableCell>
                  <TableCell>{row.access}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="text-right">{row.editor}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

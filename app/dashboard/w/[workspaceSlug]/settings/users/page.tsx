import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getWorkspaceMembers } from "@/core/access/application/workspace-members";
import { ROLE_LABELS } from "@/core/access/domain/role";
import { requireMfaUser } from "@/core/auth/mfa";
import { RoleForm } from "./role-form";

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

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Workspace settings</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          People and roles
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Roles grant permissions only inside this customer workspace. Platform
          access is managed separately.
        </p>
      </div>

      <div className="grid gap-4">
        {result.members.map((member, index) => (
          <Card key={member.id}>
            <CardHeader>
              <CardTitle>
                {member.isCurrentUser
                  ? "You"
                  : `Team member ${String(index + 1).padStart(2, "0")}`}
              </CardTitle>
              <CardDescription>
                {member.status === "ACTIVE" ? "Active" : member.status} ·{" "}
                {member.scopeMode === "WORKSPACE"
                  ? "Whole workspace"
                  : `${member.branchCount} named branch${member.branchCount === 1 ? "" : "es"}`}
              </CardDescription>
              <p className="text-xs text-muted-foreground">
                Current roles:{" "}
                {member.roles.map((role) => ROLE_LABELS[role]).join(", ")}
              </p>
            </CardHeader>
            <CardContent>
              <RoleForm
                canManage={result.canManageRoles}
                isCurrentUser={member.isCurrentUser}
                membershipId={member.id}
                roles={member.roles}
                workspaceSlug={workspaceSlug}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

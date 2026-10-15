import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
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

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-lg font-semibold">Users &amp; access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review each user’s access and edit their roles from one place.
        </p>
      </div>

      <div>
        <div
          className="hidden gap-6 border-b px-1 pb-3 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_7rem_5rem]"
          aria-hidden="true"
        >
          <span>User</span>
          <span>Access</span>
          <span>Status</span>
          <span />
        </div>
        <ul className="grid divide-y border-t md:border-t-0">
          {result.members.map((member, index) => {
            const recordedName = [member.firstName, member.lastName]
              .filter(Boolean)
              .join(" ");
            const userLabel =
              recordedName ||
              member.primaryEmail ||
              `Unnamed user ${String(index + 1).padStart(2, "0")}`;

            return (
              <li
                key={member.id}
                className="grid items-center gap-x-6 gap-y-3 px-1 py-4 sm:grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_7rem_5rem]"
              >
                <div className="min-w-0 sm:col-span-2 md:col-span-1">
                  <p className="text-sm font-semibold [overflow-wrap:anywhere]">
                    {userLabel}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    {member.primaryEmail ?? "No email recorded"}
                    {member.isCurrentUser ? " · You" : ""}
                  </p>
                </div>
                <div className="flex min-w-0 flex-wrap gap-2 sm:col-span-2 md:col-span-1">
                  <Badge
                    variant={
                      member.scopeMode === "WORKSPACE" ? "info" : "outline"
                    }
                  >
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
                <div>
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
                </div>
                <div className="justify-self-end">
                  {member.status === "ACTIVE" &&
                  ((result.canManageRoles && !member.isCurrentUser) ||
                    member.canManageScope) ? (
                    <UserAccessForm
                      branches={result.activeBranches}
                      branchIds={member.branchIds}
                      membershipId={member.id}
                      roles={member.roles}
                      scopeMode={member.scopeMode}
                      userLabel={userLabel}
                      workspaceSlug={workspaceSlug}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

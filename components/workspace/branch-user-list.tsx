import { UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatPersonName } from "@/core/platform/domain/user-profile";

type BranchUser = {
  membershipId: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmail: string | null;
  status: "ACTIVE" | "SUSPENDED" | "ENDED";
  scopeMode: "WORKSPACE" | "NAMED_BRANCHES";
};

export function BranchUserList({
  users,
  divided = true,
}: {
  users: readonly BranchUser[];
  divided?: boolean;
}) {
  return (
    <section
      aria-label="Users with access"
      className={divided ? "border-t pt-4" : undefined}
    >
      <div className="mb-3 flex items-center gap-2">
        <UsersRound aria-hidden="true" className="size-4 text-primary" />
        <h4 className="text-sm font-semibold">Users with access</h4>
        <span className="text-xs text-muted-foreground">({users.length})</span>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users assigned.</p>
      ) : (
        <ul className="grid gap-3">
          {users.map((user) => (
            <li
              key={user.membershipId}
              className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {formatPersonName(user.firstName, user.lastName)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.primaryEmail ?? "Email not recorded"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
                <Badge
                  variant={user.scopeMode === "WORKSPACE" ? "info" : "outline"}
                >
                  {user.scopeMode === "WORKSPACE"
                    ? "All branches"
                    : "This branch"}
                </Badge>
                {user.status !== "ACTIVE" && (
                  <StatusBadge
                    label={user.status === "SUSPENDED" ? "Suspended" : "Ended"}
                    tone={user.status === "SUSPENDED" ? "suspended" : "closed"}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import { LoaderCircle, Pencil, UserPlus, UserRoundMinus } from "lucide-react";
import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  updateMemberScopeAction,
  type UpdateScopeState,
} from "../branch-access-actions";

const INITIAL_STATE: UpdateScopeState = { status: "idle", message: "" };

type Candidate = {
  membershipId: string;
  label: string;
  email: string | null;
  branchIds: readonly string[];
};

type AssignedUser = Candidate & {
  canManageScope: boolean;
  scopeMode: "WORKSPACE" | "NAMED_BRANCHES";
};

function ScopeMutationForm({
  branchIds,
  label,
  membershipId,
  size = "sm",
  variant = "outline",
  workspaceSlug,
}: {
  branchIds: readonly string[];
  label: "Add" | "Remove";
  membershipId: string;
  size?: "sm" | "xs";
  variant?: "outline" | "ghost";
  workspaceSlug: string;
}) {
  const action = updateMemberScopeAction.bind(
    null,
    workspaceSlug,
    membershipId,
  );
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  return (
    <form action={formAction} className="grid justify-items-end gap-1">
      <input type="hidden" name="scopeMode" value="named_branches" />
      {branchIds.map((branchId) => (
        <input key={branchId} type="hidden" name="branchIds" value={branchId} />
      ))}
      <Button type="submit" size={size} variant={variant} disabled={pending}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : label === "Add" ? (
          <UserPlus aria-hidden="true" />
        ) : (
          <UserRoundMinus aria-hidden="true" />
        )}
        {pending ? `${label}ing` : label}
      </Button>
      {state.message && (
        <p
          role="status"
          className={
            state.status === "error"
              ? "max-w-56 text-right text-xs text-destructive"
              : "max-w-56 text-right text-xs text-success"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

export function ManageBranchUsersDialog({
  assignedUsers,
  branchId,
  candidates,
  workspaceSlug,
}: {
  assignedUsers: readonly AssignedUser[];
  branchId: string;
  candidates: readonly Candidate[];
  workspaceSlug: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button type="button" size="sm" variant="outline" />}
      >
        <Pencil aria-hidden="true" data-icon="inline-start" />
        Edit users
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit branch users</DialogTitle>
          <DialogDescription>
            Add or remove existing active users. Users with access to all
            branches must be changed from Users &amp; access.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-96 gap-5 overflow-y-auto pr-1">
          <section className="grid gap-2">
            <h4 className="text-sm font-semibold">Current users</h4>
            <ul className="grid gap-3">
              {assignedUsers.map((assignedUser) => (
                <li
                  key={assignedUser.membershipId}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {assignedUser.label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {assignedUser.email ?? "Email not recorded"}
                    </p>
                  </div>
                  {assignedUser.scopeMode === "WORKSPACE" ? (
                    <Badge variant="info">All branches</Badge>
                  ) : assignedUser.canManageScope ? (
                    <RemoveBranchUserButton
                      workspaceSlug={workspaceSlug}
                      membershipId={assignedUser.membershipId}
                      branchId={branchId}
                      branchIds={assignedUser.branchIds}
                    />
                  ) : (
                    <Badge variant="outline">Assigned</Badge>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-2">
            <h4 className="text-sm font-semibold">Available users</h4>
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Every eligible user already has access to this branch.
              </p>
            ) : (
              <ul className="grid gap-3">
                {candidates.map((candidate) => (
                  <li
                    key={candidate.membershipId}
                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {candidate.label}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {candidate.email ?? "Email not recorded"}
                      </p>
                    </div>
                    <ScopeMutationForm
                      workspaceSlug={workspaceSlug}
                      membershipId={candidate.membershipId}
                      branchIds={[...candidate.branchIds, branchId]}
                      label="Add"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveBranchUserButton({
  branchIds,
  branchId,
  membershipId,
  workspaceSlug,
}: {
  branchIds: readonly string[];
  branchId: string;
  membershipId: string;
  workspaceSlug: string;
}) {
  const remainingBranchIds = branchIds.filter((id) => id !== branchId);

  if (remainingBranchIds.length === 0) {
    return (
      <Button
        type="button"
        size="xs"
        variant="ghost"
        disabled
        title="Assign another branch before removing this one"
      >
        <UserRoundMinus aria-hidden="true" />
        Remove
      </Button>
    );
  }

  return (
    <ScopeMutationForm
      workspaceSlug={workspaceSlug}
      membershipId={membershipId}
      branchIds={remainingBranchIds}
      label="Remove"
      size="xs"
      variant="ghost"
    />
  );
}

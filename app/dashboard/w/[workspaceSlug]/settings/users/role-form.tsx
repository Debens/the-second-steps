"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  ROLE_LABELS,
  SYSTEM_ROLES,
  type SystemRole,
} from "@/core/access/domain/role";
import { updateMemberRolesAction, type UpdateRolesState } from "./actions";

const INITIAL_STATE: UpdateRolesState = { status: "idle", message: "" };

const ROLE_DESCRIPTIONS: Readonly<Record<SystemRole, string>> = {
  workspace_owner: "Account ownership, commercial settings and senior access.",
  agency_admin: "Ordinary staff, branches and agency settings.",
  branch_manager: "View-only staff access within assigned branches.",
  negotiator: "Future listings, enquiries, viewings, offers and applications.",
  property_manager: "Future tenancies, maintenance and compliance work.",
  accounts: "Reserved for an approved future accounting module.",
  read_only: "View permitted information without making changes.",
};

export function RoleForm({
  canManage,
  isCurrentUser,
  membershipId,
  roles,
  workspaceSlug,
}: {
  canManage: boolean;
  isCurrentUser: boolean;
  membershipId: string;
  roles: readonly SystemRole[];
  workspaceSlug: string;
}) {
  const action = updateMemberRolesAction.bind(
    null,
    workspaceSlug,
    membershipId,
  );
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const disabled = !canManage || isCurrentUser || pending;

  return (
    <form action={formAction} className="space-y-4">
      <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Assigned roles</legend>
        {SYSTEM_ROLES.map((role) => (
          <label
            key={role}
            className="flex cursor-pointer gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input
              type="checkbox"
              name="roles"
              value={role}
              defaultChecked={roles.includes(role)}
              className="mt-1 size-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium">
                {ROLE_LABELS[role]}
              </span>
              <span className="block text-xs text-muted-foreground">
                {ROLE_DESCRIPTIONS[role]}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {isCurrentUser && (
        <p className="text-xs text-muted-foreground">
          Your own roles cannot be changed from this session. Another Account
          Owner must make the change.
        </p>
      )}
      {!canManage && !isCurrentUser && (
        <p className="text-xs text-muted-foreground">
          You can view this membership but cannot change its roles.
        </p>
      )}
      {state.message && (
        <p
          role="status"
          className={
            state.status === "error"
              ? "text-sm text-destructive"
              : "text-sm text-success"
          }
        >
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={disabled}>
        {pending ? "Saving…" : "Save roles"}
      </Button>
    </form>
  );
}

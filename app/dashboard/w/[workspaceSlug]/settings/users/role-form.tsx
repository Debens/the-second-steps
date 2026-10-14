"use client";

import { Check, ChevronsUpDown, LoaderCircle, Pencil } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  branch_manager: "Staff visibility and work within assigned branches.",
  negotiator: "Listings, enquiries, viewings, offers and applications.",
  property_manager: "Tenancies, maintenance and compliance work.",
  accounts: "Financial work when the accounting module is available.",
  read_only: "View permitted information without making changes.",
};

export function RoleForm({
  membershipId,
  roles,
  userLabel,
  workspaceSlug,
}: {
  membershipId: string;
  roles: readonly SystemRole[];
  userLabel: string;
  workspaceSlug: string;
}) {
  const action = updateMemberRolesAction.bind(
    null,
    workspaceSlug,
    membershipId,
  );
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [selectedRoles, setSelectedRoles] =
    useState<readonly SystemRole[]>(roles);

  function toggleRole(role: SystemRole) {
    setSelectedRoles((current) => {
      if (current.includes(role)) {
        return current.filter((currentRole) => currentRole !== role);
      }
      if (role === "read_only") return [role];
      return [
        ...current.filter((currentRole) => currentRole !== "read_only"),
        role,
      ];
    });
  }

  return (
    <Dialog>
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        <Pencil aria-hidden="true" data-icon="inline-start" />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {userLabel}</DialogTitle>
          <DialogDescription>
            Choose one or more roles for this customer workspace. Read Only
            cannot be combined with another role.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          {selectedRoles.map((role) => (
            <input key={role} type="hidden" name="roles" value={role} />
          ))}

          <div className="grid gap-2">
            <span className="text-sm font-medium">Roles</span>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-9 w-full justify-between whitespace-normal text-left font-normal"
                    disabled={pending}
                  />
                }
              >
                <span>
                  {selectedRoles.length === 0
                    ? "Select roles"
                    : selectedRoles.map((role) => ROLE_LABELS[role]).join(", ")}
                </span>
                <ChevronsUpDown aria-hidden="true" className="shrink-0" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-(--anchor-width) p-1">
                <div
                  role="group"
                  aria-label="Available roles"
                  className="grid gap-1"
                >
                  {SYSTEM_ROLES.map((role) => {
                    const selected = selectedRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        role="checkbox"
                        aria-checked={selected}
                        onClick={() => toggleRole(role)}
                        className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border border-input">
                          {selected && (
                            <Check aria-hidden="true" className="size-3" />
                          )}
                        </span>
                        <span>
                          <span className="block text-sm font-medium">
                            {ROLE_LABELS[role]}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {ROLE_DESCRIPTIONS[role]}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            {selectedRoles.length === 0 && (
              <p className="text-xs text-destructive">
                Select at least one role.
              </p>
            )}
          </div>

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

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={pending || selectedRoles.length === 0}
            >
              {pending && (
                <LoaderCircle
                  aria-hidden="true"
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              {pending ? "Saving" : "Save roles"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

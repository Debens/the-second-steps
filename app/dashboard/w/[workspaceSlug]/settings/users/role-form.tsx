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
import { updateMemberAccessAction, type UpdateAccessState } from "./actions";

const INITIAL_STATE: UpdateAccessState = { status: "idle", message: "" };

const ROLE_DESCRIPTIONS: Readonly<Record<SystemRole, string>> = {
  workspace_owner: "Account ownership, commercial settings and senior access.",
  agency_admin: "Ordinary staff, branches and agency settings.",
  branch_manager: "Staff visibility and work within assigned branches.",
  negotiator: "Listings, enquiries, viewings, offers and applications.",
  property_manager: "Tenancies, maintenance and compliance work.",
  accounts: "Financial work when the accounting module is available.",
  read_only: "View permitted information without making changes.",
};

export function UserAccessForm({
  branches,
  branchIds,
  membershipId,
  roles,
  scopeMode: initialScopeMode,
  userLabel,
  workspaceSlug,
}: {
  branches: readonly { id: string; name: string }[];
  branchIds: readonly string[];
  membershipId: string;
  roles: readonly SystemRole[];
  scopeMode: "WORKSPACE" | "NAMED_BRANCHES";
  userLabel: string;
  workspaceSlug: string;
}) {
  const action = updateMemberAccessAction.bind(
    null,
    workspaceSlug,
    membershipId,
  );
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [selectedRoles, setSelectedRoles] =
    useState<readonly SystemRole[]>(roles);
  const [scopeMode, setScopeMode] = useState<"workspace" | "named_branches">(
    initialScopeMode === "WORKSPACE" ? "workspace" : "named_branches",
  );
  const [selectedBranchIds, setSelectedBranchIds] =
    useState<readonly string[]>(branchIds);

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

  function toggleBranch(branchId: string) {
    setSelectedBranchIds((current) =>
      current.includes(branchId)
        ? current.filter((id) => id !== branchId)
        : [...current, branchId],
    );
  }

  const invalidNamedScope =
    scopeMode === "named_branches" && selectedBranchIds.length === 0;

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
            Choose this user&apos;s roles and branch access. Read Only cannot be
            combined with another role.
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

          <fieldset disabled={pending} className="grid gap-3">
            <legend className="text-sm font-medium">Branch access</legend>
            <label className="flex cursor-pointer gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="scopeMode"
                value="workspace"
                checked={scopeMode === "workspace"}
                onChange={() => setScopeMode("workspace")}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">All branches</span>
                <span className="block text-xs text-muted-foreground">
                  Includes current and future branches.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="scopeMode"
                value="named_branches"
                checked={scopeMode === "named_branches"}
                onChange={() => setScopeMode("named_branches")}
                className="mt-1 size-4 accent-primary"
              />
              <span className="text-sm font-medium">Selected branches</span>
            </label>
          </fieldset>

          {scopeMode === "named_branches" && (
            <fieldset disabled={pending} className="grid gap-2">
              <legend className="sr-only">Selected branches</legend>
              {branches.map((branch) => (
                <label
                  key={branch.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                >
                  <input
                    type="checkbox"
                    name="branchIds"
                    value={branch.id}
                    checked={selectedBranchIds.includes(branch.id)}
                    onChange={() => toggleBranch(branch.id)}
                    className="size-4 accent-primary"
                  />
                  <span className="text-sm font-medium">{branch.name}</span>
                </label>
              ))}
              {branches.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No active branches are available.
                </p>
              )}
              {invalidNamedScope && (
                <p className="text-xs text-destructive">
                  Select at least one active branch.
                </p>
              )}
            </fieldset>
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

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={
                pending || selectedRoles.length === 0 || invalidNamedScope
              }
            >
              {pending && (
                <LoaderCircle
                  aria-hidden="true"
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              {pending ? "Saving" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

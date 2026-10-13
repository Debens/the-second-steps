"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { FeatureFlagSummary } from "@/core/feature-flags/application/manage-feature-flags";
import { updateFeatureFlagAction, type FeatureFlagFormState } from "./actions";

const INITIAL_STATE: FeatureFlagFormState = { status: "idle", message: "" };

export function FeatureFlagForm({ flag }: { flag: FeatureFlagSummary }) {
  const [state, formAction, pending] = useActionState(
    updateFeatureFlagAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="key" value={flag.key} />
      {flag.releaseProtected && (
        <input type="hidden" name="globalEnabled" value="on" />
      )}
      <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Audiences for {flag.displayName}</legend>
        <label className="flex cursor-pointer gap-3 rounded-lg border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <input
            type="checkbox"
            name="globalEnabled"
            defaultChecked={flag.globalEnabled || flag.releaseProtected}
            disabled={flag.releaseProtected || pending}
            className="mt-1 size-4 accent-primary"
          />
          <span>
            <span className="block text-sm font-medium">Everyone</span>
            <span className="block text-xs text-muted-foreground">
              Make this available globally unless a company override says
              otherwise.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 rounded-lg border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <input
            type="checkbox"
            name="zaytoUsersEnabled"
            defaultChecked={flag.zaytoUsersEnabled}
            disabled={pending}
            className="mt-1 size-4 accent-primary"
          />
          <span>
            <span className="block text-sm font-medium">Zayto users</span>
            <span className="block text-xs text-muted-foreground">
              Enable for identities with an active internal platform role.
            </span>
          </span>
        </label>
      </fieldset>

      {flag.releaseProtected && (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
          Release protection is active. Staff 2FA is forced on and cannot be
          disabled from this screen.
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
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save audiences"}
      </Button>
    </form>
  );
}

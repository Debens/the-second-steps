"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { CustomerFeatureFlagSummary } from "@/core/platform/application/customer-feature-flags";
import {
  updateCustomerFeatureFlagAction,
  type CustomerFeatureFlagFormState,
} from "./actions";

const INITIAL_STATE: CustomerFeatureFlagFormState = {
  status: "idle",
  message: "",
};

const OPTIONS = [
  {
    value: "inherit",
    label: "Inherit global setting",
    description: "Follow the platform-wide setting.",
  },
  {
    value: "enabled",
    label: "On for this customer",
    description: "Enable the feature specifically for this customer.",
  },
  {
    value: "disabled",
    label: "Off for this customer",
    description: "Disable the feature specifically for this customer.",
  },
] as const;

export function CustomerFeatureFlagForm({
  customerSlug,
  flag,
}: {
  customerSlug: string;
  flag: CustomerFeatureFlagSummary;
}) {
  const [state, formAction, pending] = useActionState(
    updateCustomerFeatureFlagAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="customerSlug" value={customerSlug} />
      <input type="hidden" name="key" value={flag.key} />
      <fieldset disabled={pending} className="grid gap-3 lg:grid-cols-3">
        <legend className="sr-only">Setting for {flag.displayName}</legend>
        {OPTIONS.map((option) => {
          const releaseBlocked =
            flag.releaseProtected && option.value === "disabled";
          return (
            <label
              key={option.value}
              className="flex cursor-pointer gap-3 rounded-lg border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
            >
              <input
                type="radio"
                name="mode"
                value={option.value}
                defaultChecked={flag.overrideMode === option.value}
                disabled={pending || releaseBlocked}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">
                  {option.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          Effective for customer users:{" "}
          <span className="font-semibold">
            {flag.effectiveEnabled ? "On" : "Off"}
          </span>
          {flag.overrideMode === "inherit" && (
            <span className="text-muted-foreground">
              {` (global setting is ${flag.globalEnabled ? "on" : "off"})`}
            </span>
          )}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save customer setting"}
        </Button>
      </div>

      {flag.releaseProtected && (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
          Release protection is active. Staff two-step verification cannot be
          forced off for this customer.
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
    </form>
  );
}

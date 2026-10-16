"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import type {
  EditEnquiryField,
  EditEnquiryState,
} from "@/app/dashboard/w/[workspaceSlug]/enquiries/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import { Textarea } from "@/components/ui/textarea";

const IDLE: EditEnquiryState = { status: "idle", message: "" };

type InitialDetails = {
  name: string;
  email: string;
  telephone: string;
  addressBuilding: string;
  addressStreet: string;
  postcode: string;
  summary: string;
  leadSourceId: string;
  leadMembershipId: string;
};

function ErrorText({
  name,
  message,
}: {
  name: EditEnquiryField;
  message?: string;
}) {
  return message ? (
    <p id={`${name}-error`} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

function Field({
  autoComplete = "off",
  defaultValue,
  error,
  label,
  name,
  required,
  type = "text",
}: {
  autoComplete?: string;
  defaultValue: string;
  error?: string;
  label: string;
  name: EditEnquiryField;
  required?: boolean;
  type?: "text" | "email" | "tel";
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      <ErrorText name={name} message={error} />
    </div>
  );
}

export function EditEnquiryForm({
  action,
  assignees,
  cancelPath,
  hasLinkedContact,
  hasLinkedProperty,
  initial,
  leadSources,
  responsibleBranch,
}: {
  action: (
    state: EditEnquiryState,
    formData: FormData,
  ) => Promise<EditEnquiryState>;
  assignees: readonly { value: string; label: string }[];
  cancelPath: string;
  hasLinkedContact: boolean;
  hasLinkedProperty: boolean;
  initial: InitialDetails;
  leadSources: readonly { value: string; label: string }[];
  responsibleBranch: string;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-10">
      {state.status === "error" && (
        <div
          className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          {state.message}
        </div>
      )}
      <div className="grid gap-10 xl:grid-cols-2 xl:gap-x-16">
        <div className="grid content-start gap-8">
          <section className="grid gap-4">
            <div>
              <h2 className="text-base font-semibold">Landlord</h2>
              <p className="text-sm text-muted-foreground">
                {hasLinkedContact
                  ? "These lead details do not change the linked contact record."
                  : "Keep at least one way to contact the landlord."}
              </p>
            </div>
            <Field
              label="Landlord name"
              name="name"
              required
              defaultValue={initial.name}
              error={errors.name}
              autoComplete="name"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Telephone"
                name="telephone"
                type="tel"
                defaultValue={initial.telephone}
                error={errors.telephone}
                autoComplete="tel"
              />
              <Field
                label="Email"
                name="email"
                type="email"
                defaultValue={initial.email}
                error={errors.email}
                autoComplete="email"
              />
            </div>
          </section>
          <section className="grid gap-4 border-t pt-8">
            <div>
              <h2 className="text-base font-semibold">Property</h2>
              <p className="text-sm text-muted-foreground">
                {hasLinkedProperty
                  ? "These lead details do not change the linked property record."
                  : "A postcode is required until this lead has a linked property."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Flat or building (optional)"
                name="addressBuilding"
                defaultValue={initial.addressBuilding}
                error={errors.addressBuilding}
                autoComplete="address-line1"
              />
              <Field
                label="Street (optional)"
                name="addressStreet"
                defaultValue={initial.addressStreet}
                error={errors.addressStreet}
                autoComplete="address-line2"
              />
            </div>
            <Field
              label="Postcode"
              name="postcode"
              required={!hasLinkedProperty}
              defaultValue={initial.postcode}
              error={errors.postcode}
              autoComplete="postal-code"
            />
          </section>
        </div>
        <div className="grid content-start gap-8">
          <section className="grid gap-4">
            <div>
              <h2 className="text-base font-semibold">Responsibility</h2>
              <p className="text-sm text-muted-foreground">
                The responsible branch cannot be changed from this form.
              </p>
            </div>
            <div className="grid gap-1">
              <p className="text-xs text-muted-foreground">
                Responsible branch
              </p>
              <p className="text-sm font-medium">{responsibleBranch}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leadSourceId">Lead source</Label>
              <OptionSelect
                id="leadSourceId"
                name="leadSourceId"
                defaultValue={initial.leadSourceId}
                placeholder="Not recorded"
                options={[{ value: "", label: "Not recorded" }, ...leadSources]}
              />
              <ErrorText name="leadSourceId" message={errors.leadSourceId} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leadMembershipId">Lead staff member</Label>
              <OptionSelect
                id="leadMembershipId"
                name="leadMembershipId"
                defaultValue={initial.leadMembershipId}
                placeholder="Unassigned"
                options={[{ value: "", label: "Unassigned" }, ...assignees]}
              />
              <ErrorText
                name="leadMembershipId"
                message={errors.leadMembershipId}
              />
            </div>
          </section>
          <section className="grid gap-2 border-t pt-8">
            <Label htmlFor="summary">Internal summary (optional)</Label>
            <Textarea
              id="summary"
              name="summary"
              rows={7}
              defaultValue={initial.summary}
              aria-invalid={Boolean(errors.summary)}
              aria-describedby={errors.summary ? "summary-error" : undefined}
            />
            <ErrorText name="summary" message={errors.summary} />
          </section>
        </div>
      </div>
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t bg-background/95 py-4 backdrop-blur">
        <Button
          variant="outline"
          render={<Link href={cancelPath} />}
          nativeButton={false}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

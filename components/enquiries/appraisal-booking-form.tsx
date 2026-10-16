"use client";

import { LoaderCircle, SearchCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { AppraisalBookingState } from "@/app/dashboard/w/[workspaceSlug]/enquiries/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import { Textarea } from "@/components/ui/textarea";
import { PROPERTY_TYPES } from "@/core/properties/domain/property";

const IDLE: AppraisalBookingState = { status: "idle", message: "" };
const TYPE_LABELS: Record<(typeof PROPERTY_TYPES)[number], string> = {
  detached: "Detached",
  semi_detached: "Semi-detached",
  terraced: "Terraced",
  bungalow: "Bungalow",
  flat: "Flat",
  maisonette: "Maisonette",
  room: "Room",
  other: "Other",
};

function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: "text" | "email" | "tel" | "number";
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={type === "number" ? 0 : undefined}
      />
    </div>
  );
}

export function AppraisalBookingForm({
  action,
  cancelHref,
  enquiry,
  assignees,
}: {
  action: (
    state: AppraisalBookingState,
    formData: FormData,
  ) => Promise<AppraisalBookingState>;
  cancelHref: string;
  enquiry: {
    name: string;
    email: string | null;
    telephone: string | null;
    addressBuilding: string | null;
    addressStreet: string | null;
    postcode: string;
  };
  assignees: readonly { membershipId: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [kind, setKind] = useState<"person" | "organisation">("person");
  const [scheduledAt, setScheduledAt] = useState("");
  const names = enquiry.name.trim().split(/\s+/);
  const reviewed = state.status === "review";

  return (
    <form action={formAction} className="grid gap-10">
      {state.message && (
        <div
          role={state.status === "error" ? "alert" : "status"}
          className={`rounded-lg p-4 text-sm ${state.status === "error" ? "bg-destructive/10 text-destructive" : "bg-info-soft text-info"}`}
        >
          {state.message}
        </div>
      )}
      <input
        type="hidden"
        name="scheduledAtIso"
        value={scheduledAt ? new Date(scheduledAt).toISOString() : ""}
      />
      <div className="grid gap-10 xl:grid-cols-2 xl:gap-x-16">
        <div className="grid content-start gap-8">
          <section className="grid gap-4">
            <div>
              <h2 className="font-semibold">Visit</h2>
              <p className="text-sm text-muted-foreground">
                Choose when the appraisal will happen and who will attend.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scheduledAt">Date and time</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignedMembershipId">Assigned to</Label>
              <OptionSelect
                id="assignedMembershipId"
                name="assignedMembershipId"
                required
                placeholder="Choose a staff member"
                options={assignees.map(({ membershipId, name }) => ({
                  value: membershipId,
                  label: name,
                }))}
              />
            </div>
          </section>
          <section className="grid gap-4 border-t pt-8">
            <div>
              <h2 className="font-semibold">Landlord contact</h2>
              <p className="text-sm text-muted-foreground">
                The real contact record is created or linked when you book.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactKind">Contact type</Label>
              <OptionSelect
                id="contactKind"
                name="contactKind"
                value={kind}
                onValueChange={(value) => setKind(value as typeof kind)}
                options={[
                  { value: "person", label: "Person" },
                  { value: "organisation", label: "Organisation" },
                ]}
              />
            </div>
            {kind === "person" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="First name"
                  name="firstName"
                  defaultValue={names.slice(0, -1).join(" ") || names[0]}
                  required
                />
                <Field
                  label="Last name"
                  name="lastName"
                  defaultValue={names.length > 1 ? names.at(-1) : ""}
                  required
                />
              </div>
            ) : (
              <>
                <Field
                  label="Legal name"
                  name="legalName"
                  defaultValue={enquiry.name}
                  required
                />
                <div className="grid gap-2">
                  <Label htmlFor="organisationType">Organisation type</Label>
                  <OptionSelect
                    id="organisationType"
                    name="organisationType"
                    required
                    defaultValue="limited_company"
                    options={[
                      { value: "limited_company", label: "Limited company" },
                      { value: "llp", label: "LLP" },
                      { value: "partnership", label: "Partnership" },
                      { value: "trust", label: "Trust" },
                      { value: "charity", label: "Charity" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                </div>
              </>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Email"
                name="email"
                type="email"
                defaultValue={enquiry.email ?? ""}
              />
              <Field
                label="Telephone"
                name="telephone"
                type="tel"
                defaultValue={enquiry.telephone ?? ""}
              />
            </div>
          </section>
        </div>
        <section className="grid content-start gap-4">
          <div>
            <h2 className="font-semibold">Property record</h2>
            <p className="text-sm text-muted-foreground">
              Complete the address and core property details.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Flat or building"
              name="addressBuilding"
              defaultValue={enquiry.addressBuilding ?? ""}
            />
            <Field
              label="Street"
              name="addressStreet"
              defaultValue={enquiry.addressStreet ?? ""}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Locality" name="addressLocality" />
            <Field label="Town or city" name="townCity" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="County" name="county" />
            <Field
              label="Postcode"
              name="postcode"
              defaultValue={enquiry.postcode}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="propertyType">Property type</Label>
            <OptionSelect
              id="propertyType"
              name="propertyType"
              required
              placeholder="Choose a type"
              options={PROPERTY_TYPES.map((value) => ({
                value,
                label: TYPE_LABELS[value],
              }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Bedrooms" name="bedrooms" type="number" />
            <Field label="Bathrooms" name="bathrooms" type="number" />
            <Field label="Receptions" name="receptionRooms" type="number" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="propertyNotes">Property notes</Label>
            <Textarea id="propertyNotes" name="propertyNotes" rows={3} />
          </div>
        </section>
      </div>

      {reviewed && (
        <section className="grid gap-6 border-t pt-8">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <SearchCheck className="size-4" />
              Duplicate review
            </h2>
            <p className="text-sm text-muted-foreground">
              Select an existing record if it is the same landlord or property.
              Otherwise create a new one.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <fieldset className="grid gap-3">
              <legend className="font-medium">Landlord contact</legend>
              {state.contactMatches?.map((match) => (
                <input
                  key={match.id}
                  type="hidden"
                  name="reviewedContactId"
                  value={match.id}
                />
              ))}
              {state.contactMatches?.map((match) => (
                <label
                  key={match.id}
                  className="flex gap-3 rounded-lg border p-3 text-sm"
                >
                  <input type="radio" name="contactChoice" value={match.id} />
                  <span>
                    <strong>{match.name}</strong> ({match.reference})<br />
                    <span className="text-muted-foreground">
                      Matched {match.matchedFields.join(", ")} ·{" "}
                      {match.strength}
                    </span>
                  </span>
                </label>
              ))}
              <label className="flex gap-3 rounded-lg border p-3 text-sm">
                <input
                  type="radio"
                  name="contactChoice"
                  value="new"
                  defaultChecked
                />
                Create a new contact
              </label>
            </fieldset>
            <fieldset className="grid gap-3">
              <legend className="font-medium">Property</legend>
              {state.propertyMatches?.map((match) => (
                <input
                  key={match.id}
                  type="hidden"
                  name="reviewedPropertyId"
                  value={match.id}
                />
              ))}
              {state.propertyMatches?.map((match) => (
                <label
                  key={match.id}
                  className="flex gap-3 rounded-lg border p-3 text-sm"
                >
                  <input
                    type="radio"
                    name="propertyChoice"
                    value={match.id}
                    disabled={match.archived}
                  />
                  <span>
                    <strong>{match.addressLine}</strong> ({match.reference})
                    <br />
                    <span className="text-muted-foreground">
                      {match.postcode} · {match.strength}
                      {match.archived ? " · Archived" : ""}
                    </span>
                  </span>
                </label>
              ))}
              <label className="flex gap-3 rounded-lg border p-3 text-sm">
                <input
                  type="radio"
                  name="propertyChoice"
                  value="new"
                  defaultChecked
                />
                Create a new property
              </label>
            </fieldset>
          </div>
        </section>
      )}

      <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t bg-background/95 py-4 backdrop-blur">
        <Button
          variant="outline"
          render={<Link href={cancelHref} />}
          nativeButton={false}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          name="intent"
          value={reviewed ? "book" : "review"}
          disabled={pending}
        >
          {pending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          {reviewed ? "Book appraisal" : "Review duplicates"}
        </Button>
      </div>
    </form>
  );
}

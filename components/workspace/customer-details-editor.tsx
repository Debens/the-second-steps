"use client";

import { LoaderCircle, Pencil } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomerDetailsFormState } from "@/core/workspace/application/workspace-details";
import {
  CUSTOMER_DETAIL_FIELDS,
  CUSTOMER_DETAIL_LIMITS,
  type CustomerDetailField,
  type ValidCustomerDetails,
} from "@/core/workspace/domain/customer-details";

const INITIAL_STATE: CustomerDetailsFormState = {
  status: "idle",
  message: "",
};

type CustomerDetailsAction = (
  previousState: CustomerDetailsFormState,
  formData: FormData,
) => Promise<CustomerDetailsFormState>;

type FieldDefinition = {
  name: CustomerDetailField;
  label: string;
  type?: "email" | "tel" | "url";
  autoComplete?: string;
  maximum: number;
  required?: boolean;
  className?: string;
};

const CUSTOMER_FIELDS: readonly FieldDefinition[] = [
  {
    name: "displayName",
    label: "Customer name",
    autoComplete: "organization",
    maximum: CUSTOMER_DETAIL_LIMITS.displayName,
    required: true,
  },
  {
    name: "legalName",
    label: "Legal name",
    autoComplete: "organization",
    maximum: CUSTOMER_DETAIL_LIMITS.legalName,
  },
  {
    name: "companyNumber",
    label: "Companies House number",
    maximum: CUSTOMER_DETAIL_LIMITS.companyNumber,
  },
] as const;

const CONTACT_FIELDS: readonly FieldDefinition[] = [
  {
    name: "primaryEmail",
    label: "Primary email",
    type: "email",
    autoComplete: "email",
    maximum: CUSTOMER_DETAIL_LIMITS.primaryEmail,
  },
  {
    name: "telephone",
    label: "Telephone",
    type: "tel",
    autoComplete: "tel",
    maximum: CUSTOMER_DETAIL_LIMITS.telephone,
  },
  {
    name: "website",
    label: "Website",
    type: "url",
    autoComplete: "url",
    maximum: CUSTOMER_DETAIL_LIMITS.website,
  },
  {
    name: "registeredAddress1",
    label: "Registered address line 1",
    autoComplete: "address-line1",
    maximum: CUSTOMER_DETAIL_LIMITS.addressLine,
    className: "lg:col-span-2",
  },
  {
    name: "registeredAddress2",
    label: "Registered address line 2",
    autoComplete: "address-line2",
    maximum: CUSTOMER_DETAIL_LIMITS.addressLine,
    className: "lg:col-span-2",
  },
  {
    name: "registeredTownCity",
    label: "Town or city",
    autoComplete: "address-level2",
    maximum: CUSTOMER_DETAIL_LIMITS.townCity,
  },
  {
    name: "registeredCounty",
    label: "County",
    autoComplete: "address-level1",
    maximum: CUSTOMER_DETAIL_LIMITS.county,
  },
  {
    name: "registeredPostcode",
    label: "Postcode",
    autoComplete: "postal-code",
    maximum: CUSTOMER_DETAIL_LIMITS.postcode,
  },
] as const;

function valueOrFallback(value: React.ReactNode) {
  return value || <span className="text-muted-foreground">Not recorded</span>;
}

function Detail({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">
        {valueOrFallback(children)}
      </dd>
    </div>
  );
}

function DetailsForm({
  action,
  details,
  fields,
  saveLabel,
  onCancel,
  onSaved,
}: {
  action: CustomerDetailsAction;
  details: ValidCustomerDetails;
  fields: readonly FieldDefinition[];
  saveLabel: string;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const visibleFields = new Set(fields.map(({ name }) => name));

  useEffect(() => {
    if (state.status === "success") onSaved(state.message);
  }, [onSaved, state.message, state.status]);

  return (
    <form action={formAction} className="grid gap-6">
      {CUSTOMER_DETAIL_FIELDS.filter((field) => !visibleFields.has(field)).map(
        (field) => (
          <input
            key={field}
            type="hidden"
            name={field}
            value={details[field] ?? ""}
          />
        ),
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {fields.map((field) => {
          const error = state.fieldErrors?.[field.name];
          const errorId = `${field.name}-error`;

          return (
            <div
              key={field.name}
              className={`grid gap-2 ${field.className ?? ""}`}
            >
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                type={field.type}
                defaultValue={details[field.name] ?? ""}
                maxLength={field.maximum}
                autoComplete={field.autoComplete}
                required={field.required}
                disabled={pending}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
              />
              {error && (
                <p id={errorId} className="text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && (
            <LoaderCircle
              aria-hidden="true"
              data-icon="inline-start"
              className="animate-spin"
            />
          )}
          {pending ? "Saving" : saveLabel}
        </Button>
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive" role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function CustomerDetailsEditor({
  action,
  canEdit = true,
  createdAtLabel,
  details,
  typeLabel,
}: {
  action: CustomerDetailsAction;
  canEdit?: boolean;
  createdAtLabel?: string;
  details: ValidCustomerDetails;
  typeLabel: string;
}) {
  const [editing, setEditing] = useState<"customer" | "contact" | null>(null);
  const [message, setMessage] = useState("");
  const address = [
    details.registeredAddress1,
    details.registeredAddress2,
    details.registeredTownCity,
    details.registeredCounty,
    details.registeredPostcode,
  ]
    .filter(Boolean)
    .join(", ");

  function startEditing(section: "customer" | "contact") {
    setMessage("");
    setEditing(section);
  }

  function finishEditing(nextMessage: string) {
    setMessage(nextMessage);
    setEditing(null);
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-8">
        <section className="grid gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Customer details</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Account identity and customer classification.
              </p>
            </div>
            {canEdit && editing === null && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Edit customer details"
                  onClick={() => startEditing("customer")}
                >
                  <Pencil aria-hidden="true" data-icon="inline-start" />
                  Edit
                </Button>
              </div>
            )}
          </div>
          <div>
            {editing === "customer" ? (
              <DetailsForm
                action={action}
                details={details}
                fields={CUSTOMER_FIELDS}
                saveLabel="Save customer details"
                onCancel={() => setEditing(null)}
                onSaved={finishEditing}
              />
            ) : (
              <dl className="grid gap-5 sm:grid-cols-2">
                <Detail label="Customer name">{details.displayName}</Detail>
                <Detail label="Legal name">{details.legalName}</Detail>
                <Detail label="Companies House number">
                  {details.companyNumber}
                </Detail>
                <Detail label="Customer type">{typeLabel}</Detail>
                {createdAtLabel && (
                  <Detail label="Date added">{createdAtLabel}</Detail>
                )}
              </dl>
            )}
          </div>
        </section>

        <section className="grid gap-4 border-t pt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Contact details</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Primary contact information and registered address.
              </p>
            </div>
            {canEdit && editing === null && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Edit contact details"
                  onClick={() => startEditing("contact")}
                >
                  <Pencil aria-hidden="true" data-icon="inline-start" />
                  Edit
                </Button>
              </div>
            )}
          </div>
          <div>
            {editing === "contact" ? (
              <DetailsForm
                action={action}
                details={details}
                fields={CONTACT_FIELDS}
                saveLabel="Save contact details"
                onCancel={() => setEditing(null)}
                onSaved={finishEditing}
              />
            ) : (
              <dl className="grid gap-5 sm:grid-cols-2">
                <Detail label="Email">{details.primaryEmail}</Detail>
                <Detail label="Telephone">{details.telephone}</Detail>
                <Detail label="Website" className="sm:col-span-2">
                  {details.website}
                </Detail>
                <Detail label="Registered address" className="sm:col-span-2">
                  {address}
                </Detail>
              </dl>
            )}
          </div>
        </section>
      </div>

      {message && (
        <p className="text-sm text-success" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

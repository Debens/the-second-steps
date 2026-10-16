"use client";

import { LoaderCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import type {
  OwnerContactResult,
  PropertyFormState,
  QuickAddOwnerInput,
  QuickAddOwnerState,
} from "@/app/dashboard/w/[workspaceSlug]/properties/actions";
import { OwnerPicker } from "@/components/properties/owner-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import { Textarea } from "@/components/ui/textarea";
import type { PropertyDuplicate } from "@/core/properties/application/properties";
import {
  COUNCIL_TAX_BANDS,
  PROPERTY_FEATURE_GROUPS,
  PROPERTY_TYPES,
} from "@/core/properties/domain/property";
import {
  FLOOR_AREA_UNIT_LABELS,
  FURNISHED_STATUS_LABELS,
  PROPERTY_FEATURE_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/core/properties/domain/property-labels";

type FormAction = (
  state: PropertyFormState,
  data: FormData,
) => Promise<PropertyFormState>;

const IDLE: PropertyFormState = { status: "idle", message: "" };

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="text-xs text-destructive">
      {message}
    </p>
  );
}

function TextField({
  label,
  name,
  error,
  required,
  onBlur,
  autoComplete,
  type = "text",
  className,
  min,
  max,
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  onBlur?: () => void;
  autoComplete?: string;
  type?: "text" | "number";
  className?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        onBlur={onBlur}
        autoComplete={autoComplete ?? "off"}
        inputMode={type === "number" ? "numeric" : undefined}
        min={min}
        max={max}
        step={type === "number" ? 1 : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      <FieldError id={name} message={error} />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  placeholder,
  error,
  required,
}: {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  placeholder: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <OptionSelect
        id={name}
        name={name}
        options={options}
        placeholder={placeholder}
        required={required}
      />
      <FieldError id={name} message={error} />
    </div>
  );
}

function DuplicateWarning({
  duplicates,
  basePath,
}: {
  duplicates: readonly PropertyDuplicate[];
  basePath: string;
}) {
  if (!duplicates.length) return null;
  const strong = duplicates.some(({ strength }) => strength === "strong");
  return (
    <div
      className="grid gap-3 rounded-lg bg-warning-soft p-4 text-sm"
      role="status"
    >
      <p className="flex items-center gap-2 font-medium">
        <TriangleAlert className="size-4 text-warning" aria-hidden="true" />
        {strong
          ? "This address already exists"
          : "A similar address already exists"}
      </p>
      <p className="text-muted-foreground">
        Check these before creating a new record. You can still continue if this
        is a different property.
      </p>
      <ul className="grid divide-y">
        {duplicates.map((duplicate) => (
          <li
            key={duplicate.id}
            className="flex flex-wrap items-center justify-between gap-2 py-2"
          >
            <span className="min-w-0">
              <Link
                href={`${basePath}/${duplicate.id}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline-offset-4 hover:underline [overflow-wrap:anywhere]"
              >
                {duplicate.addressLine}
              </Link>
              <span className="block text-xs text-muted-foreground">
                {duplicate.postcode} · {duplicate.reference}
                {duplicate.archived && " · Archived"}
              </span>
            </span>
            <span className="text-xs font-medium">
              {duplicate.strength === "strong"
                ? "Same address"
                : "Same street and postcode"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PropertyForm({
  action,
  basePath,
  branches,
  checkDuplicates,
  quickAdd,
  searchOwners,
}: {
  action: FormAction;
  basePath: string;
  branches: readonly { id: string; name: string }[];
  checkDuplicates: (address: {
    building: string;
    street: string;
    postcode: string;
  }) => Promise<PropertyDuplicate[]>;
  quickAdd: (
    branchId: string,
    input: QuickAddOwnerInput & {
      email: string;
      telephone: string;
      reviewToken: string;
    },
  ) => Promise<QuickAddOwnerState>;
  searchOwners: (query: string) => Promise<OwnerContactResult[]>;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const [duplicates, setDuplicates] = useState<PropertyDuplicate[]>([]);
  const [, startCheck] = useTransition();
  const [branchId, setBranchId] = useState(
    branches.length === 1 ? branches[0].id : "",
  );
  const errors = state.fieldErrors ?? {};

  function checkAddress() {
    const form = formRef.current;
    if (!form) return;
    const value = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "";
    const address = {
      building: value("addressBuilding"),
      street: value("addressStreet"),
      postcode: value("postcode"),
    };
    startCheck(async () => setDuplicates(await checkDuplicates(address)));
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-10"
      noValidate={false}
    >
      <div className="grid gap-10 xl:grid-cols-2 xl:gap-x-16">
        <div className="grid content-start gap-10">
          <section className="grid gap-4">
            <h2 className="text-base font-semibold">Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Flat or building (optional)"
                name="addressBuilding"
                error={errors.addressBuilding}
                onBlur={checkAddress}
              />
              <TextField
                label="Street"
                name="addressStreet"
                required
                error={errors.addressStreet}
                onBlur={checkAddress}
              />
              <TextField
                label="Locality (optional)"
                name="addressLocality"
                error={errors.addressLocality}
              />
              <TextField
                label="Town or city"
                name="townCity"
                required
                error={errors.townCity}
                autoComplete="address-level2"
              />
              <TextField
                label="County (optional)"
                name="county"
                error={errors.county}
              />
              <TextField
                label="Postcode"
                name="postcode"
                required
                error={errors.postcode}
                autoComplete="postal-code"
                onBlur={checkAddress}
              />
            </div>
            <DuplicateWarning duplicates={duplicates} basePath={basePath} />
          </section>

          <section className="grid gap-4 border-t pt-8">
            <h2 className="text-base font-semibold">Property details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Property type"
                name="propertyType"
                placeholder="Choose a type"
                required
                error={errors.propertyType}
                options={PROPERTY_TYPES.map((type) => ({
                  value: type,
                  label: PROPERTY_TYPE_LABELS[type],
                }))}
              />
              <SelectField
                label="Furnishing (optional)"
                name="furnishedStatus"
                placeholder="Not recorded"
                error={errors.furnishedStatus}
                options={[
                  { value: "", label: "Not recorded" },
                  ...Object.entries(FURNISHED_STATUS_LABELS).map(
                    ([value, label]) => ({ value, label }),
                  ),
                ]}
              />
              <TextField
                label="Bedrooms"
                name="bedrooms"
                type="number"
                min={0}
                max={50}
                error={errors.bedrooms}
              />
              <TextField
                label="Bathrooms"
                name="bathrooms"
                type="number"
                min={0}
                max={50}
                error={errors.bathrooms}
              />
              <TextField
                label="Reception rooms"
                name="receptionRooms"
                type="number"
                min={0}
                max={50}
                error={errors.receptionRooms}
              />
              <SelectField
                label="Council tax band (optional)"
                name="councilTaxBand"
                placeholder="Not recorded"
                error={errors.councilTaxBand}
                options={[
                  { value: "", label: "Not recorded" },
                  ...COUNCIL_TAX_BANDS.map((band) => ({
                    value: band,
                    label: `Band ${band}`,
                  })),
                ]}
              />
              <TextField
                label="Floor area (optional)"
                name="floorArea"
                type="number"
                min={1}
                error={errors.floorArea}
              />
              <SelectField
                label="Floor area unit"
                name="floorAreaUnit"
                placeholder="Choose a unit"
                error={errors.floorAreaUnit}
                options={[
                  { value: "", label: "No floor area" },
                  ...Object.entries(FLOOR_AREA_UNIT_LABELS).map(
                    ([value, label]) => ({ value, label }),
                  ),
                ]}
              />
            </div>
          </section>

          <section className="grid gap-4 border-t pt-8">
            <h2 className="text-base font-semibold">Features</h2>
            {errors.features && (
              <p className="text-xs text-destructive">{errors.features}</p>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              {PROPERTY_FEATURE_GROUPS.map((group) => (
                <fieldset
                  key={group.label}
                  className="grid content-start gap-2"
                >
                  <legend className="mb-1 text-sm font-medium">
                    {group.label}
                  </legend>
                  {group.features.map((feature) => (
                    <label
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input type="checkbox" name="features" value={feature} />
                      {PROPERTY_FEATURE_LABELS[feature]}
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
          </section>
        </div>

        <div className="grid content-start gap-10 border-t pt-8 xl:border-t-0 xl:pt-0">
          <section className="grid gap-4">
            <h2 className="text-base font-semibold">Responsible branch</h2>
            <div className="grid gap-2">
              <Label htmlFor="branchId">Branch</Label>
              <OptionSelect
                id="branchId"
                name="branchId"
                value={branchId}
                onValueChange={setBranchId}
                placeholder="Choose a branch"
                required
                options={branches.map(({ id, name }) => ({
                  value: id,
                  label: name,
                }))}
              />
              <p className="text-xs text-muted-foreground">
                The branch that looks after this property. Only people with
                access to it will see the property.
              </p>
            </div>
          </section>

          <section className="grid gap-4 border-t pt-8">
            <h2 className="text-base font-semibold">Owners</h2>
            <p className="text-sm text-muted-foreground">
              Add everyone who owns the property. One owner is the lead
              landlord, the main contact for the property.
            </p>
            <OwnerPicker
              branchId={branchId}
              quickAdd={quickAdd}
              search={searchOwners}
            />
          </section>

          <section className="grid gap-4 border-t pt-8">
            <h2 className="text-base font-semibold">Notes</h2>
            <div className="grid gap-2">
              <Label htmlFor="parkingNotes">Parking (optional)</Label>
              <Textarea
                id="parkingNotes"
                name="parkingNotes"
                maxLength={500}
                placeholder="Anything unusual, such as shared access"
              />
              <FieldError id="parkingNotes" message={errors.parkingNotes} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="outdoorSpaceNotes">
                Outdoor space (optional)
              </Label>
              <Textarea
                id="outdoorSpaceNotes"
                name="outdoorSpaceNotes"
                maxLength={500}
              />
              <FieldError
                id="outdoorSpaceNotes"
                message={errors.outdoorSpaceNotes}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="generalNotes">Internal summary (optional)</Label>
              <Textarea
                id="generalNotes"
                name="generalNotes"
                maxLength={2000}
                placeholder="A short summary for colleagues. Dated discussion belongs in notes on the property record."
              />
              <FieldError id="generalNotes" message={errors.generalNotes} />
            </div>
          </section>
        </div>
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap gap-3 border-t pt-6">
        <Button type="submit" disabled={pending}>
          {pending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          Create property
        </Button>
        <Button
          variant="outline"
          render={<Link href={basePath} />}
          nativeButton={false}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

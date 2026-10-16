"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type {
  QuickEnquiryField,
  QuickEnquiryState,
} from "@/app/dashboard/w/[workspaceSlug]/enquiries/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import { Textarea } from "@/components/ui/textarea";

const IDLE: QuickEnquiryState = { status: "idle", message: "" };

function ErrorText({
  name,
  message,
}: {
  name: QuickEnquiryField;
  message?: string;
}) {
  return message ? (
    <p id={`${name}-error`} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

function Field({
  label,
  name,
  error,
  required,
  type = "text",
  autoComplete = "off",
  placeholder,
}: {
  label: string;
  name: QuickEnquiryField;
  error?: string;
  required?: boolean;
  type?: "text" | "email" | "tel" | "date";
  autoComplete?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      <ErrorText name={name} message={error} />
    </div>
  );
}

export function QuickEnquiryForm({
  action,
  basePath,
  branches,
  leadSources,
  assignees,
  currentMembershipId,
}: {
  action: (
    state: QuickEnquiryState,
    formData: FormData,
  ) => Promise<QuickEnquiryState>;
  basePath: string;
  branches: readonly { id: string; name: string }[];
  leadSources: readonly { id: string; name: string }[];
  assignees: readonly {
    membershipId: string;
    name: string;
    branchIds: readonly string[] | null;
  }[];
  currentMembershipId: string;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [branchId, setBranchId] = useState(
    branches.length === 1 ? branches[0].id : "",
  );
  const [leadMembershipId, setLeadMembershipId] = useState(currentMembershipId);
  const [taskAssigneeId, setTaskAssigneeId] = useState(currentMembershipId);
  const [addTask, setAddTask] = useState(true);
  const eligibleAssignees = useMemo(
    () =>
      assignees.filter(
        (assignee) =>
          !branchId ||
          assignee.branchIds === null ||
          assignee.branchIds.includes(branchId),
      ),
    [assignees, branchId],
  );
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
                A name and at least one way to make contact.
              </p>
            </div>
            <Field
              label="Landlord name"
              name="name"
              required
              error={errors.name}
              autoComplete="name"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Telephone"
                name="telephone"
                type="tel"
                error={errors.telephone}
                autoComplete="tel"
              />
              <Field
                label="Email"
                name="email"
                type="email"
                error={errors.email}
                autoComplete="email"
              />
            </div>
          </section>
          <section className="grid gap-4 border-t pt-8">
            <div>
              <h2 className="text-base font-semibold">Property</h2>
              <p className="text-sm text-muted-foreground">
                A postcode is enough for quick capture; complete the address
                when booking the appraisal.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Flat or building (optional)"
                name="addressBuilding"
                error={errors.addressBuilding}
                autoComplete="address-line1"
              />
              <Field
                label="Street (optional)"
                name="addressStreet"
                error={errors.addressStreet}
                autoComplete="address-line2"
              />
            </div>
            <Field
              label="Postcode"
              name="postcode"
              required
              error={errors.postcode}
              autoComplete="postal-code"
            />
          </section>
        </div>
        <div className="grid content-start gap-8">
          <section className="grid gap-4">
            <h2 className="text-base font-semibold">Responsibility</h2>
            <div className="grid gap-2">
              <Label htmlFor="branchId">Responsible branch</Label>
              <OptionSelect
                id="branchId"
                name="branchId"
                required
                value={branchId}
                onValueChange={(value) => {
                  setBranchId(value);
                  const eligible = (membershipId: string) =>
                    assignees.some(
                      (assignee) =>
                        assignee.membershipId === membershipId &&
                        (assignee.branchIds === null ||
                          assignee.branchIds.includes(value)),
                    );
                  if (!eligible(leadMembershipId)) setLeadMembershipId("");
                  if (!eligible(taskAssigneeId)) setTaskAssigneeId("");
                }}
                placeholder="Choose a branch"
                options={branches.map(({ id, name }) => ({
                  value: id,
                  label: name,
                }))}
              />
              <ErrorText name="branchId" message={errors.branchId} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leadSourceId">
                Lead source (optional for now)
              </Label>
              <OptionSelect
                id="leadSourceId"
                name="leadSourceId"
                placeholder="Not recorded"
                options={[
                  { value: "", label: "Not recorded" },
                  ...leadSources.map(({ id, name }) => ({
                    value: id,
                    label: name,
                  })),
                ]}
              />
              <ErrorText name="leadSourceId" message={errors.leadSourceId} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leadMembershipId">
                Lead staff member (optional)
              </Label>
              <OptionSelect
                id="leadMembershipId"
                name="leadMembershipId"
                placeholder="Unassigned"
                value={leadMembershipId}
                onValueChange={setLeadMembershipId}
                options={[
                  { value: "", label: "Unassigned" },
                  ...eligibleAssignees.map(({ membershipId, name }) => ({
                    value: membershipId,
                    label: name,
                  })),
                ]}
              />
              <ErrorText
                name="leadMembershipId"
                message={errors.leadMembershipId}
              />
            </div>
          </section>
          <section className="grid gap-4 border-t pt-8">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={addTask}
                onChange={(event) => setAddTask(event.target.checked)}
              />
              Add the first next action
            </label>
            {addTask && (
              <div className="grid gap-4 rounded-xl bg-muted p-4">
                <Field
                  label="What needs doing?"
                  name="taskTitle"
                  required
                  error={errors.taskTitle}
                  placeholder="Call landlord"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Due date"
                    name="taskDueOn"
                    type="date"
                    required
                    error={errors.taskDueOn}
                  />
                  <div className="grid gap-2">
                    <Label htmlFor="taskAssigneeId">Assigned to</Label>
                    <OptionSelect
                      id="taskAssigneeId"
                      name="taskAssigneeId"
                      required
                      placeholder="Choose a staff member"
                      value={taskAssigneeId}
                      onValueChange={setTaskAssigneeId}
                      options={eligibleAssignees.map(
                        ({ membershipId, name }) => ({
                          value: membershipId,
                          label: name,
                        }),
                      )}
                    />
                    <ErrorText
                      name="taskAssigneeId"
                      message={errors.taskAssigneeId}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
          <section className="grid gap-2 border-t pt-8">
            <Label htmlFor="summary">Internal summary (optional)</Label>
            <Textarea
              id="summary"
              name="summary"
              rows={5}
              placeholder="What the landlord needs and any useful context"
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
          render={<Link href={basePath} />}
          nativeButton={false}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          {pending ? "Saving…" : "Save enquiry"}
        </Button>
      </div>
    </form>
  );
}

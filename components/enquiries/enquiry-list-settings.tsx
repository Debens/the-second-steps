"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useActionState } from "react";
import type { EnquiryListState } from "@/app/dashboard/w/[workspaceSlug]/settings/enquiries/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";

const IDLE: EnquiryListState = { status: "idle", message: "" };
type Item = {
  id: string;
  name: string;
  status: "active" | "hidden";
  sortOrder: number;
  appliesTo?: "lost" | "postponed" | "both";
};

function AddItem({
  action,
  kind,
}: {
  action: (
    state: EnquiryListState,
    formData: FormData,
  ) => Promise<EnquiryListState>;
  kind: "lead_source" | "outcome_reason";
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
    >
      <input type="hidden" name="kind" value={kind} />
      <div className="grid gap-2">
        <Label htmlFor={`new-${kind}`}>
          New {kind === "lead_source" ? "lead source" : "reason"}
        </Label>
        <Input id={`new-${kind}`} name="name" required />
      </div>
      {kind === "outcome_reason" && (
        <div className="grid gap-2">
          <Label htmlFor="new-appliesTo">Applies to</Label>
          <OptionSelect
            id="new-appliesTo"
            name="appliesTo"
            defaultValue="both"
            options={[
              { value: "lost", label: "Lost" },
              { value: "postponed", label: "Postponed" },
              { value: "both", label: "Both" },
            ]}
          />
        </div>
      )}
      <Button type="submit" disabled={pending}>
        <Plus aria-hidden="true" />
        Add
      </Button>
      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`text-sm sm:col-span-full ${state.status === "error" ? "text-destructive" : "text-success"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

function ItemRow({
  item,
  kind,
  action,
}: {
  item: Item;
  kind: "lead_source" | "outcome_reason";
  action: (
    state: EnquiryListState,
    formData: FormData,
  ) => Promise<EnquiryListState>;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  return (
    <form
      action={formAction}
      className="grid gap-3 border-t py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto_auto] sm:items-end"
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="itemId" value={item.id} />
      <div className="grid gap-2">
        <Label htmlFor={`order-${item.id}`}>Order</Label>
        <Input
          id={`order-${item.id}`}
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={item.sortOrder}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`name-${item.id}`}>
          Name{item.appliesTo ? ` · ${item.appliesTo}` : ""}
        </Label>
        <Input
          id={`name-${item.id}`}
          name="name"
          defaultValue={item.name}
          required
        />
      </div>
      <label className="flex h-9 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="hidden"
          defaultChecked={item.status === "hidden"}
        />
        Hidden
      </label>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />}Save
      </Button>
      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`text-xs sm:col-span-full ${state.status === "error" ? "text-destructive" : "text-success"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

export function EnquiryListSettings({
  leadSources,
  outcomeReasons,
  addAction,
  updateAction,
  canManage,
}: {
  leadSources: Item[];
  outcomeReasons: Item[];
  addAction: (
    state: EnquiryListState,
    formData: FormData,
  ) => Promise<EnquiryListState>;
  updateAction: (
    state: EnquiryListState,
    formData: FormData,
  ) => Promise<EnquiryListState>;
  canManage: boolean;
}) {
  return (
    <div className="grid gap-12">
      <section className="grid gap-4">
        <div>
          <h2 className="font-semibold">Lead sources</h2>
          <p className="text-sm text-muted-foreground">
            Used to show where landlord leads came from.
          </p>
        </div>
        {canManage && <AddItem action={addAction} kind="lead_source" />}
        <div>
          {leadSources.map((item) =>
            canManage ? (
              <ItemRow
                key={item.id}
                item={item}
                kind="lead_source"
                action={updateAction}
              />
            ) : (
              <p key={item.id} className="border-t py-3 text-sm">
                {item.name}
                {item.status === "hidden" && (
                  <span className="ml-2 text-muted-foreground">Hidden</span>
                )}
              </p>
            ),
          )}
        </div>
      </section>
      <section className="grid gap-4">
        <div>
          <h2 className="font-semibold">Outcome reasons</h2>
          <p className="text-sm text-muted-foreground">
            Reasons for lost and postponed landlord leads. What a reason applies
            to cannot be changed after creation.
          </p>
        </div>
        {canManage && <AddItem action={addAction} kind="outcome_reason" />}
        <div>
          {outcomeReasons.map((item) =>
            canManage ? (
              <ItemRow
                key={item.id}
                item={item}
                kind="outcome_reason"
                action={updateAction}
              />
            ) : (
              <p key={item.id} className="border-t py-3 text-sm">
                {item.name} · {item.appliesTo}
                {item.status === "hidden" && (
                  <span className="ml-2 text-muted-foreground">Hidden</span>
                )}
              </p>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import { STAFF } from "./shared";
import { TODAY_ISO, type Kind, type NewActionInput } from "./overview-state";

const NO_LEAD = "none";
const LEADS = [
  { value: "Marcus Webb", place: "42 Elm Road, M20 4AB" },
  { value: "Hannah Fox", place: "7 Mill Lane, M21 8QP" },
  { value: "Dev Patel", place: "15 Quay Street, M3 4NB" },
  { value: "Sofia Marin", place: "9 Weir Close, M3 6TZ" },
  { value: "Callum Reid", place: "88 Station Road, M22 1AA" },
  { value: "Grace Okafor", place: "3 Park View, M14 5DR" },
  { value: "Tom Ellery", place: "28 Orchard Way, M19 2LF" },
  { value: "Ingrid Larsen", place: "61 Canal Street, M1 3HE" },
];

const KINDS: { value: Kind; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "send", label: "Send something" },
  { value: "chase", label: "Chase" },
];

/** The one entry point for adding an action from the dashboard. */
export function AddActionDialog({
  onAdd,
}: {
  onAdd: (input: NewActionInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Kind>("call");
  const [lead, setLead] = useState(NO_LEAD);
  const [dueDate, setDueDate] = useState(TODAY_ISO);
  const [assignee, setAssignee] = useState("olivia");
  const [tried, setTried] = useState(false);

  const titleError = tried && !title.trim() ? "Say what needs doing." : null;
  const dateError =
    tried && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? "Choose a due date." : null;

  function reset() {
    setTitle("");
    setKind("call");
    setLead(NO_LEAD);
    setDueDate(TODAY_ISO);
    setAssignee("olivia");
    setTried(false);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTried(true);
    if (!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return;
    const chosen = LEADS.find((item) => item.value === lead);
    onAdd({
      title: title.trim(),
      kind,
      lead: chosen?.value ?? "",
      place: chosen?.place ?? "",
      dueDate,
      assignee,
    });
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Plus aria-hidden="true" />
        Add action
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Add an action</DialogTitle>
            <DialogDescription>
              It joins the list in due order. Link it to a lead if it belongs to
              one.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="action-title">What needs doing?</Label>
            <Input
              id="action-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              autoComplete="off"
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? "action-title-error" : undefined}
              placeholder="Ring about the tenancy end date"
            />
            {titleError && (
              <p id="action-title-error" className="text-xs text-destructive">
                {titleError}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="action-kind">Type</Label>
              <OptionSelect
                id="action-kind"
                value={kind}
                onValueChange={(value) => setKind(value as Kind)}
                options={KINDS}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="action-due">Due</Label>
              <Input
                id="action-due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                aria-invalid={Boolean(dateError)}
              />
              {dateError && (
                <p className="text-xs text-destructive">{dateError}</p>
              )}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="action-lead">Linked landlord lead</Label>
            <OptionSelect
              id="action-lead"
              value={lead}
              onValueChange={setLead}
              options={[
                { value: NO_LEAD, label: "Not linked to a lead" },
                ...LEADS.map((item) => ({
                  value: item.value,
                  label: `${item.value}, ${item.place}`,
                })),
              ]}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="action-assignee">Assign to</Label>
            <OptionSelect
              id="action-assignee"
              value={assignee}
              onValueChange={setAssignee}
              options={STAFF.map((person) => ({
                value: person.id,
                label:
                  person.id === "olivia" ? `${person.name} (you)` : person.name,
              }))}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit">Add action</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

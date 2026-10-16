"use client";

import {
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Send,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ActionMenu, STAFF, useUndoToast } from "./shared";

/* One set of sample data and one set of working actions, shared by every
   Overview layout, so the options differ only in layout. */

export type Kind = "call" | "email" | "send" | "chase";
export type Group = "overdue" | "today" | "week";
export type Task = {
  id: string;
  kind: Kind;
  title: string;
  lead: string;
  place: string;
  due: string;
  group: Group;
  state: "open" | "done";
  slot?: string;
};
export type NextStep = { id: string; label: string; due: string };
export type Unactioned = {
  id: string;
  lead: string;
  place: string;
  ago: string;
};
export type Visit = {
  id: string;
  time: string;
  title: string;
  who: string;
  place: string;
};

export const KIND_ICON = {
  call: Phone,
  email: Mail,
  send: Send,
  chase: Clock,
};

export const GROUP_TITLE: Record<Group, string> = {
  overdue: "Overdue",
  today: "Due today",
  week: "Coming up",
};

export const NEXT_STEPS: NextStep[] = [
  { id: "n1", label: "Call again in 2 days", due: "Tue 20 Oct" },
  { id: "n2", label: "Send terms tomorrow", due: "Tomorrow" },
  { id: "n3", label: "Chase next week", due: "Mon 26 Oct" },
];

const START: Task[] = [
  {
    id: "t1",
    kind: "send",
    title: "Send fee guide",
    lead: "Dev Patel",
    place: "15 Quay Street, M3 4NB",
    due: "3 days overdue",
    group: "overdue",
    state: "open",
  },
  {
    id: "t2",
    kind: "call",
    title: "Call to arrange a valuation",
    lead: "Marcus Webb",
    place: "42 Elm Road, M20 4AB",
    due: "Yesterday",
    group: "overdue",
    state: "open",
  },
  {
    id: "t3",
    kind: "email",
    title: "Send terms of business",
    lead: "Ingrid Larsen",
    place: "61 Canal Street, M1 3HE",
    due: "Today",
    group: "today",
    state: "open",
  },
  {
    id: "t4",
    kind: "chase",
    title: "Chase decision on terms",
    lead: "Priyanka Rao",
    place: "12 Hall Gardens, M16 7UP",
    due: "Today",
    group: "today",
    state: "open",
  },
  {
    id: "t5",
    kind: "call",
    title: "Introductory call",
    lead: "Sofia Marin",
    place: "9 Weir Close, M3 6TZ",
    due: "Tomorrow",
    group: "week",
    state: "open",
  },
  {
    id: "t6",
    kind: "email",
    title: "Confirm access for appraisal",
    lead: "Tom Ellery",
    place: "28 Orchard Way, M19 2LF",
    due: "Mon 19 Oct",
    group: "week",
    state: "open",
  },
];

const UNACTIONED: Unactioned[] = [
  {
    id: "u1",
    lead: "Hannah Fox",
    place: "7 Mill Lane, M21 8QP",
    ago: "Received today",
  },
  {
    id: "u2",
    lead: "Callum Reid",
    place: "88 Station Road, M22 1AA",
    ago: "Received 2 days ago",
  },
];

export const SCHEDULE: Visit[] = [
  {
    id: "s1",
    time: "10:30",
    title: "Appraisal at 3 Park View",
    who: "Grace Okafor",
    place: "3 Park View, M14 5DR",
  },
  {
    id: "s2",
    time: "15:00",
    title: "Appraisal at 61 Canal Street",
    who: "Ingrid Larsen",
    place: "61 Canal Street, M1 3HE",
  },
];

export function useOverviewState() {
  const [tasks, setTasks] = useState(START);
  const [unactioned, setUnactioned] = useState(UNACTIONED);
  const [outcomeFor, setOutcomeFor] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<string[]>([]);
  const toast = useUndoToast();

  const open = tasks.filter((task) => task.state === "open");
  const count = (group: Group) =>
    open.filter((task) => task.group === group).length;

  function patch(id: string, change: Partial<Task>) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...change } : task)),
    );
  }

  const api = {
    complete(task: Task) {
      patch(task.id, { state: "done" });
      toast.show(`Done: ${task.title}`, () =>
        patch(task.id, { state: "open" }),
      );
    },
    snooze(task: Task, label: string) {
      const previous = { due: task.due, group: task.group, slot: task.slot };
      patch(task.id, { due: label, group: "week", slot: undefined });
      toast.show(`Moved to ${label}`, () => patch(task.id, previous));
    },
    reassign(task: Task, name: string) {
      const previous = tasks;
      setTasks((current) => current.filter((item) => item.id !== task.id));
      toast.show(`Handed to ${name}`, () => setTasks(previous));
    },
    planNext(task: Task, step: NextStep) {
      setTasks((current) => [
        ...current.filter((item) => item.id !== task.id),
        {
          ...task,
          id: `${task.id}-${step.id}`,
          title: step.label,
          due: step.due,
          group: "week",
          state: "open",
          slot: undefined,
        },
      ]);
      toast.show(`Next step set: ${step.label}`);
    },
    noMore(task: Task) {
      setTasks((current) => current.filter((item) => item.id !== task.id));
      toast.show(
        "No further step. Close the lead from its page if it is finished.",
      );
    },
    contact(task: Task) {
      toast.show(
        task.kind === "email"
          ? `Opening an email to ${task.lead} (mock-up)`
          : `Calling ${task.lead} (mock-up)`,
      );
    },
    schedule(task: Task, slot: string) {
      const previous = { slot: task.slot, group: task.group, due: task.due };
      patch(task.id, { slot, group: "today", due: `Today, ${slot}` });
      toast.show(`Planned for ${slot}`, () => patch(task.id, previous));
    },
    addNext(lead: Unactioned, step: NextStep) {
      setUnactioned((current) => current.filter((item) => item.id !== lead.id));
      toast.show(`${lead.lead}: ${step.label} (${step.due})`, () =>
        setUnactioned((current) => [...current, lead]),
      );
    },
    bulk(
      ids: string[],
      action: "done" | "snooze" | "reassign",
      label?: string,
    ) {
      const previous = tasks;
      if (action === "done") {
        setTasks((current) =>
          current.map((task) =>
            ids.includes(task.id) ? { ...task, state: "done" } : task,
          ),
        );
      } else if (action === "snooze") {
        setTasks((current) =>
          current.map((task) =>
            ids.includes(task.id)
              ? {
                  ...task,
                  due: label ?? "Tomorrow",
                  group: "week",
                  slot: undefined,
                }
              : task,
          ),
        );
      } else {
        setTasks((current) => current.filter((task) => !ids.includes(task.id)));
      }
      const noun = `${ids.length} action${ids.length === 1 ? "" : "s"}`;
      toast.show(
        action === "done"
          ? `${noun} marked done`
          : action === "snooze"
            ? `${noun} moved to ${label}`
            : `${noun} handed to ${label}`,
        () => setTasks(previous),
      );
    },
    book(name: string) {
      toast.show(`Book an appraisal for ${name} (mock-up)`);
    },
    info(message: string) {
      toast.show(message);
    },
  };

  return {
    tasks,
    open,
    count,
    unactioned,
    recorded,
    outcomeFor,
    setOutcomeFor,
    toastNode: toast.node,
    saveOutcome() {
      if (outcomeFor) setRecorded((current) => [...current, outcomeFor]);
      setOutcomeFor(null);
      toast.show("Outcome recorded and next step set");
    },
    api,
  };
}

export type OverviewApi = ReturnType<typeof useOverviewState>["api"];

/** The row menu: snooze and hand over. Used by every layout. */
export function taskMenu(task: Task, api: OverviewApi) {
  return [
    {
      label: "Snooze to tomorrow",
      icon: Clock,
      onSelect: () => api.snooze(task, "Tomorrow"),
    },
    {
      label: "Snooze to Monday",
      icon: Clock,
      onSelect: () => api.snooze(task, "Mon 19 Oct"),
    },
    {
      label: "Snooze to next week",
      icon: Clock,
      onSelect: () => api.snooze(task, "Mon 26 Oct"),
    },
    ...STAFF.filter((person) => person.id !== "olivia").map((person) => ({
      label: `Hand to ${person.name}`,
      icon: UserRound,
      onSelect: () => api.reassign(task, person.name),
    })),
  ];
}

/** "What happens next?" shown after something is ticked off. */
export function NextStepPrompt({
  task,
  api,
}: {
  task: Task;
  api: OverviewApi;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium">What happens next?</span>
      {NEXT_STEPS.map((step) => (
        <Button
          key={step.id}
          size="xs"
          variant="outline"
          onClick={() => api.planNext(task, step)}
        >
          {step.label}
        </Button>
      ))}
      <Button size="xs" variant="ghost" onClick={() => api.noMore(task)}>
        Nothing more
      </Button>
    </div>
  );
}

export function DoneRow({ task, api }: { task: Task; api: OverviewApi }) {
  return (
    <div className="grid gap-2 rounded-lg bg-success-soft/50 px-3 py-3">
      <p className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 aria-hidden="true" className="size-4" />
        <span className="line-through">{task.title}</span>
        <span className="text-muted-foreground">· {task.lead}</span>
      </p>
      <NextStepPrompt task={task} api={api} />
    </div>
  );
}

export function ContactButton({ task, api }: { task: Task; api: OverviewApi }) {
  if (task.kind !== "call" && task.kind !== "email") return null;
  const Icon = KIND_ICON[task.kind];
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => api.contact(task)}
      aria-label={`${task.kind === "call" ? "Call" : "Email"} ${task.lead}`}
    >
      <Icon aria-hidden="true" />
      <span className="hidden md:inline">
        {task.kind === "call" ? "Call" : "Email"}
      </span>
    </Button>
  );
}

export function RowMenu({ task, api }: { task: Task; api: OverviewApi }) {
  return (
    <ActionMenu
      label={`More actions for ${task.title}`}
      items={taskMenu(task, api)}
    />
  );
}

export function DueBadge({ task }: { task: Task }) {
  return (
    <Badge variant={task.group === "overdue" ? "destructive" : "secondary"}>
      {task.due}
    </Badge>
  );
}

export function OutcomeSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Record appraisal outcome</SheetTitle>
          <SheetDescription>
            Saved against the lead. You will be asked for the next step.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4">
          <div className="grid gap-1.5">
            <Label htmlFor="lab-rent">Expected monthly rent (£)</Label>
            <Input id="lab-rent" inputMode="decimal" placeholder="1,350" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lab-service">Recommended service</Label>
            <OptionSelect
              id="lab-service"
              placeholder="Choose a service"
              options={[
                { value: "let_only", label: "Let only" },
                { value: "rent_collection", label: "Rent collection" },
                { value: "fully_managed", label: "Fully managed" },
              ]}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lab-next">Next step</Label>
            <OptionSelect
              id="lab-next"
              placeholder="Choose the next step"
              options={NEXT_STEPS.map((step) => ({
                value: step.id,
                label: `${step.label} (${step.due})`,
              }))}
            />
          </div>
        </div>
        <SheetFooter>
          <Button onClick={onSave}>Save outcome</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

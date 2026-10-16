"use client";

import {
  AlarmClock,
  ArrowRight,
  CalendarPlus,
  CircleSlash,
  Clock,
  Trophy,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import {
  ActionMenu,
  Avatar,
  AvailabilityBadge,
  DesignNotes,
  FilterChips,
  KpiTile,
  Segments,
  personById,
  STAFF,
  useUndoToast,
} from "./shared";

type Stage = "new" | "booked" | "completed";
type Lead = {
  id: string;
  name: string;
  place: string;
  branch: "main" | "riverside";
  stage: Stage;
  owner: string | null;
  waiting: number;
  next: string | null;
  overdue: boolean;
  fee?: string;
};

const START: Lead[] = [
  {
    id: "l1",
    name: "Marcus Webb",
    place: "42 Elm Road",
    branch: "main",
    stage: "new",
    owner: "priya",
    waiting: 2,
    next: "Call to arrange a valuation",
    overdue: true,
  },
  {
    id: "l2",
    name: "Hannah Fox",
    place: "7 Mill Lane",
    branch: "main",
    stage: "new",
    owner: null,
    waiting: 1,
    next: null,
    overdue: false,
  },
  {
    id: "l3",
    name: "Dev Patel",
    place: "15 Quay Street",
    branch: "riverside",
    stage: "new",
    owner: "olivia",
    waiting: 9,
    next: "Send fee guide",
    overdue: true,
  },
  {
    id: "l4",
    name: "Sofia Marin",
    place: "9 Weir Close",
    branch: "riverside",
    stage: "new",
    owner: "ruby",
    waiting: 1,
    next: "Introductory call",
    overdue: false,
  },
  {
    id: "l5",
    name: "Callum Reid",
    place: "88 Station Road",
    branch: "main",
    stage: "new",
    owner: null,
    waiting: 3,
    next: null,
    overdue: false,
  },
  {
    id: "l6",
    name: "Grace Okafor",
    place: "3 Park View",
    branch: "main",
    stage: "booked",
    owner: "olivia",
    waiting: 0,
    next: "Appraisal today, 10:30",
    overdue: false,
  },
  {
    id: "l7",
    name: "Tom Ellery",
    place: "28 Orchard Way",
    branch: "main",
    stage: "booked",
    owner: "priya",
    waiting: 1,
    next: "Confirm access",
    overdue: false,
  },
  {
    id: "l8",
    name: "Ingrid Larsen",
    place: "61 Canal Street",
    branch: "riverside",
    stage: "completed",
    owner: "ruby",
    waiting: 5,
    next: "Chase decision on terms",
    overdue: false,
    fee: "£162 / month",
  },
  {
    id: "l9",
    name: "Priyanka Rao",
    place: "12 Hall Gardens",
    branch: "main",
    stage: "completed",
    owner: "priya",
    waiting: 8,
    next: "Chase decision on terms",
    overdue: true,
    fee: "£99 / month",
  },
];

const COLUMNS: { id: Stage; title: string; primary: string }[] = [
  { id: "new", title: "New lead", primary: "Book appraisal" },
  { id: "booked", title: "Appraisal booked", primary: "Record outcome" },
  { id: "completed", title: "Awaiting decision", primary: "Mark won" },
];

const LOST_REASONS = [
  "Went with another agent",
  "Fees too high",
  "Decided to sell",
  "Could not contact",
];

export function LeadPipeline() {
  const [leads, setLeads] = useState(START);
  const [branch, setBranch] = useState<"all" | "main" | "riverside">("all");
  const [closing, setClosing] = useState<Lead | null>(null);
  const [reason, setReason] = useState("");
  const toast = useUndoToast();

  const shown = leads.filter(
    (lead) => branch === "all" || lead.branch === branch,
  );
  const unassigned = shown.filter((lead) => lead.owner === null);
  const overdue = shown.filter((lead) => lead.overdue).length;
  const stuck = shown.filter((lead) => lead.waiting >= 7).length;
  const noAction = shown.filter((lead) => lead.next === null).length;

  function update(id: string, change: Partial<Lead>, message: string) {
    const before = leads.find((lead) => lead.id === id)!;
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, ...change } : lead)),
    );
    toast.show(message, () =>
      setLeads((current) =>
        current.map((lead) => (lead.id === id ? before : lead)),
      ),
    );
  }

  function advance(lead: Lead) {
    if (lead.stage === "new") {
      update(
        lead.id,
        {
          stage: "booked",
          waiting: 0,
          next: "Appraisal booked for Tue 20 Oct",
          overdue: false,
        },
        `${lead.name}: appraisal booked`,
      );
    } else if (lead.stage === "booked") {
      update(
        lead.id,
        {
          stage: "completed",
          waiting: 0,
          next: "Chase decision on terms",
          overdue: false,
          fee: "£135 / month",
        },
        `${lead.name}: outcome recorded`,
      );
    } else {
      const previous = leads;
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      toast.show(`${lead.name}: won. Ready for an instruction.`, () =>
        setLeads(previous),
      );
    }
  }

  function close() {
    if (!closing || !reason) return;
    const previous = leads;
    setLeads((current) => current.filter((lead) => lead.id !== closing.id));
    toast.show(`${closing.name}: closed as lost (${reason})`, () =>
      setLeads(previous),
    );
    setClosing(null);
    setReason("");
  }

  const load = STAFF.map((person) => {
    const mine = shown.filter((lead) => lead.owner === person.id);
    return {
      person,
      total: mine.length,
      late: mine.filter((lead) => lead.overdue).length,
    };
  });
  const busiest = Math.max(1, ...load.map((row) => row.total));

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Branch manager</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Landlord lead pipeline
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Move work forward, hand it out and spot what is going stale.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AvailabilityBadge value="now" />
          <FilterChips
            label="Branch"
            value={branch}
            onChange={setBranch}
            options={[
              { id: "all", label: "All branches" },
              { id: "main", label: "Main" },
              { id: "riverside", label: "Riverside" },
            ]}
          />
        </div>
      </header>

      <section
        aria-label="Summary"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <KpiTile label="Open leads" value={String(shown.length)} />
        <KpiTile
          label="No owner or next action"
          value={String(unassigned.length + noAction)}
          tone={unassigned.length + noAction ? "warning" : "default"}
          note="Fix these first"
        />
        <KpiTile
          label="Overdue actions"
          value={String(overdue)}
          tone={overdue ? "destructive" : "default"}
        />
        <KpiTile
          label="Waiting 7+ days"
          value={String(stuck)}
          tone={stuck ? "warning" : "default"}
          note="Stuck in a stage"
        />
      </section>

      {unassigned.length > 0 && (
        <section
          aria-label="Unassigned leads"
          className="rounded-xl bg-warning-soft p-4"
        >
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-warning">
            <UserRound aria-hidden="true" className="size-4" />
            {unassigned.length} lead{unassigned.length === 1 ? "" : "s"} without
            an owner
          </h2>
          <ul className="grid gap-3">
            {unassigned.map((lead) => (
              <li
                key={lead.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <p className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{lead.name}</span>{" "}
                  <span className="text-muted-foreground">
                    · {lead.place} · {lead.waiting} day
                    {lead.waiting === 1 ? "" : "s"} old
                  </span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STAFF.filter((person) => person.id !== "amelia").map(
                    (person) => (
                      <Button
                        key={person.id}
                        size="xs"
                        variant="outline"
                        onClick={() =>
                          update(
                            lead.id,
                            {
                              owner: person.id,
                              next: "Call to introduce ourselves",
                            },
                            `${lead.name} assigned to ${person.name}`,
                          )
                        }
                      >
                        <Avatar
                          person={person}
                          className="size-4 text-[0.55rem]"
                        />
                        {person.name.split(" ")[0]}
                      </Button>
                    ),
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-6 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const cards = shown.filter((lead) => lead.stage === column.id);
            return (
              <section
                key={column.id}
                aria-label={column.title}
                className="min-w-0 rounded-xl bg-muted/60 p-3"
              >
                <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold">
                  {column.title}
                  <Badge variant="secondary" className="tabular-nums">
                    {cards.length}
                  </Badge>
                </h2>
                {cards.length === 0 ? (
                  <p className="px-1 py-4 text-sm text-muted-foreground">
                    Nothing here.
                  </p>
                ) : (
                  <ul className="grid gap-3">
                    {cards.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        primary={column.primary}
                        onAdvance={() => advance(lead)}
                        onAssign={(id) =>
                          update(
                            lead.id,
                            { owner: id },
                            `${lead.name} assigned to ${personById(id).name}`,
                          )
                        }
                        onNudge={() =>
                          update(
                            lead.id,
                            { next: "Follow up tomorrow", overdue: false },
                            `Next action set for ${lead.name}`,
                          )
                        }
                        onClose={() => setClosing(lead)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        <section
          aria-label="Team workload"
          className="grid content-start gap-3"
        >
          <h2 className="border-b pb-2 text-sm font-semibold">Team workload</h2>
          <ul className="grid gap-4">
            {load.map((row) => (
              <li key={row.person.id} className="grid gap-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <Avatar person={row.person} />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {row.person.name}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {row.total} open
                  </span>
                  {row.late > 0 && (
                    <Badge variant="destructive">{row.late} late</Badge>
                  )}
                </div>
                <Segments
                  filled={Math.round((row.total / busiest) * 12)}
                  tone={row.late ? "warning" : "primary"}
                  label={`${row.person.name} has ${row.total} open leads`}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Dialog
        open={closing !== null}
        onOpenChange={(open) => !open && setClosing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close {closing?.name} as lost?</DialogTitle>
            <DialogDescription>
              A reason is always recorded so the agency can learn from it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="lab-reason">Reason</Label>
            <OptionSelect
              id="lab-reason"
              value={reason}
              onValueChange={setReason}
              placeholder="Choose a reason"
              options={LOST_REASONS.map((item) => ({
                value: item,
                label: item,
              }))}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button disabled={!reason} onClick={close}>
              Close lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {toast.node}

      <DesignNotes
        who="Branch managers and agency admins who decide who does what and keep the pipeline moving."
        why="A board shows flow and bottlenecks at a glance, and the problems that need a decision (no owner, no next action, going stale) are lifted above it instead of buried in cards."
        actions={[
          "Assign an unowned lead in one tap",
          "Move a card forward with its primary button",
          "Set a next action or reassign from the card menu",
          "Close as lost, with the required reason, in a small dialog",
          "Switch branch without leaving the page",
        ]}
        needs={[
          "Landlord leads, stages and outcomes (built)",
          "Branch scope already limits what each manager sees (built)",
          "Instructions, so Won becomes one tap into onboarding (Chunk 6)",
        ]}
      />
    </div>
  );
}

function LeadCard({
  lead,
  primary,
  onAdvance,
  onAssign,
  onNudge,
  onClose,
}: {
  lead: Lead;
  primary: string;
  onAdvance: () => void;
  onAssign: (id: string) => void;
  onNudge: () => void;
  onClose: () => void;
}) {
  const owner = lead.owner ? personById(lead.owner) : null;
  return (
    <li className="grid min-w-0 gap-3 rounded-xl bg-card p-3 shadow-xs ring-1 ring-foreground/10">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{lead.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {lead.place} · {lead.branch === "main" ? "Main" : "Riverside"}
          </p>
        </div>
        <ActionMenu
          label={`More actions for ${lead.name}`}
          items={[
            ...STAFF.filter((person) => person.id !== lead.owner).map(
              (person) => ({
                label: `Assign to ${person.name}`,
                icon: UserRound,
                onSelect: () => onAssign(person.id),
              }),
            ),
            {
              label: "Set next action: follow up tomorrow",
              icon: Clock,
              onSelect: onNudge,
            },
            {
              label: "Close as lost…",
              icon: CircleSlash,
              onSelect: onClose,
              destructive: true,
            },
          ]}
        />
      </div>
      <p
        className={
          lead.next
            ? "flex items-center gap-1.5 text-xs"
            : "flex items-center gap-1.5 text-xs font-medium text-warning"
        }
      >
        {lead.overdue ? (
          <AlarmClock
            aria-hidden="true"
            className="size-3.5 text-destructive"
          />
        ) : (
          <Clock
            aria-hidden="true"
            className="size-3.5 text-muted-foreground"
          />
        )}
        {lead.next ?? "No next action"}
        {lead.overdue && <span className="text-destructive">· overdue</span>}
      </p>
      {lead.fee && (
        <p className="text-xs text-muted-foreground">
          Expected fee{" "}
          <span className="font-medium text-foreground">{lead.fee}</span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {owner ? (
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Avatar person={owner} />
            <span className="truncate">{owner.name}</span>
          </span>
        ) : (
          <Badge variant="warning">No owner</Badge>
        )}
        <span className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {lead.waiting >= 4 && (
            <Badge variant={lead.waiting >= 7 ? "destructive" : "warning"}>
              {lead.waiting} days
            </Badge>
          )}
          <Button size="sm" onClick={onAdvance}>
            {primary === "Mark won" ? (
              <Trophy aria-hidden="true" />
            ) : primary === "Book appraisal" ? (
              <CalendarPlus aria-hidden="true" />
            ) : (
              <ArrowRight aria-hidden="true" />
            )}
            {primary}
          </Button>
        </span>
      </div>
    </li>
  );
}

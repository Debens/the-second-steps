"use client";

import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileText,
  Home,
  MapPin,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ActionMenu,
  Avatar,
  FilterChips,
  Segments,
  STAFF,
  personById,
  useUndoToast,
} from "./shared";
import {
  ContactButton,
  DoneRow,
  DueBadge,
  MODULE_LABEL,
  RowMenu,
  SCHEDULE,
  sortByDue,
  type Task,
  type useOverviewState,
} from "./overview-state";
import { cn } from "cn";
import { AddActionDialog } from "./add-action-dialog";

type State = ReturnType<typeof useOverviewState>;
type Tab = "overview" | "pipeline" | "schedule" | "team";
type RailFilter = "all" | "overdue" | "today";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "pipeline", label: "Pipeline" },
  { id: "schedule", label: "Schedule" },
  { id: "team", label: "Team" },
];

const HOURS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

const ACTIVITY = [
  {
    who: "priya",
    text: "booked an appraisal for Tom Ellery",
    when: "12 min ago",
  },
  {
    who: "ruby",
    text: "recorded the outcome for Ingrid Larsen",
    when: "1 hour ago",
  },
  {
    who: "olivia",
    text: "won Priyanka Rao's landlord lead",
    when: "Yesterday",
  },
  {
    who: "amelia",
    text: "added Hannah Fox as a landlord lead",
    when: "Yesterday",
  },
  {
    who: "priya",
    text: "closed Callum Reid as lost: fees too high",
    when: "Wed 14 Oct",
  },
];

const STAGES = [
  { id: "new", label: "New lead", value: "£0" },
  { id: "booked", label: "Appraisal booked", value: "£0" },
  { id: "completed", label: "Awaiting decision", value: "£261 / mo" },
] as const;
type StageId = (typeof STAGES)[number]["id"];
type PipelineLead = {
  id: string;
  name: string;
  place: string;
  stage: StageId;
  owner: string;
  days: number;
};
const PIPELINE: PipelineLead[] = [
  {
    id: "p1",
    name: "Marcus Webb",
    place: "42 Elm Road",
    stage: "new",
    owner: "priya",
    days: 2,
  },
  {
    id: "p2",
    name: "Dev Patel",
    place: "15 Quay Street",
    stage: "new",
    owner: "olivia",
    days: 9,
  },
  {
    id: "p3",
    name: "Sofia Marin",
    place: "9 Weir Close",
    stage: "new",
    owner: "ruby",
    days: 1,
  },
  {
    id: "p4",
    name: "Grace Okafor",
    place: "3 Park View",
    stage: "booked",
    owner: "olivia",
    days: 0,
  },
  {
    id: "p5",
    name: "Tom Ellery",
    place: "28 Orchard Way",
    stage: "booked",
    owner: "priya",
    days: 1,
  },
  {
    id: "p6",
    name: "Ingrid Larsen",
    place: "61 Canal Street",
    stage: "completed",
    owner: "ruby",
    days: 5,
  },
  {
    id: "p7",
    name: "Priyanka Rao",
    place: "12 Hall Gardens",
    stage: "completed",
    owner: "priya",
    days: 8,
  },
];

type Alert = {
  id: string;
  text: string;
  action: string;
  preview?: string;
};
const ALERTS: Alert[] = [
  { id: "a1", text: "2 leads have no owner", action: "Assign" },
  { id: "a2", text: "Dev Patel's lead has waited 9 days", action: "Open lead" },
  {
    id: "a3",
    text: "Gas safety record expires in 12 days: 3 Park View",
    action: "Book engineer",
    preview: "Compliance, Phase 4",
  },
  {
    id: "a4",
    text: "Rent 5 days late: 28 Orchard Way",
    action: "Send reminder",
    preview: "Rent, Phase 4",
  },
];

/**
 * G: a tabbed dashboard. The tabs hold the picture (overview, pipeline,
 * schedule, team); the Actions list stays on the right whichever tab is open.
 */
export function OverviewTabbed({ state }: { state: State }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [dense, setDense] = useState(true);
  const toast = useUndoToast();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Search everything"
            placeholder="Search leads, contacts, properties…"
            className="pl-9"
            onKeyDown={(event) => {
              if (event.key === "Enter")
                toast.show("Search is not wired up in this mock-up");
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionMenu
            text="New"
            icon={Plus}
            label="Create something new"
            items={[
              {
                label: "Landlord lead",
                icon: UserPlus,
                onSelect: () =>
                  toast.show("Opening quick landlord lead (mock-up)"),
              },
              {
                label: "Contact",
                icon: Users,
                onSelect: () => toast.show("Opening new contact (mock-up)"),
              },
              {
                label: "Property",
                icon: Home,
                onSelect: () => toast.show("Opening new property (mock-up)"),
              },
              {
                label: "Appraisal booking",
                icon: CalendarClock,
                onSelect: () => toast.show("Opening booking (mock-up)"),
              },
            ]}
          />
          <div
            role="group"
            aria-label="Density"
            className="flex rounded-lg border p-0.5"
          >
            {[
              [false, "Comfortable"],
              [true, "Compact"],
            ].map(([value, label]) => (
              <Button
                key={String(label)}
                size="xs"
                variant={dense === value ? "default" : "ghost"}
                aria-pressed={dense === value}
                onClick={() => setDense(value as boolean)}
              >
                {label as string}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <section aria-label="Dashboard" className="min-w-0">
          <div
            role="tablist"
            aria-label="Dashboard views"
            className="mb-4 flex gap-1 border-b"
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                role="tab"
                type="button"
                id={`tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={`panel-${item.id}`}
                onClick={() => setTab(item.id)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring",
                  tab === item.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
          >
            {tab === "overview" && (
              <OverviewTab
                state={state}
                dense={dense}
                go={setTab}
                toast={toast.show}
              />
            )}
            {tab === "pipeline" && (
              <PipelineTab dense={dense} toast={toast.show} />
            )}
            {tab === "schedule" && <ScheduleTab state={state} />}
            {tab === "team" && <TeamTab dense={dense} toast={toast.show} />}
          </div>
        </section>

        <ActionsRail state={state} dense={dense} />
      </div>
      {toast.node}
    </div>
  );
}

function Panel({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="min-w-0 rounded-xl bg-card shadow-xs ring-1 ring-foreground/10"
    >
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>
      <div className="p-1">{children}</div>
    </section>
  );
}

function OverviewTab({
  state,
  dense,
  go,
  toast,
}: {
  state: State;
  dense: boolean;
  go: (tab: Tab) => void;
  toast: (message: string) => void;
}) {
  const { recorded, setOutcomeFor, count, unactioned } = state;
  const [alerts, setAlerts] = useState(ALERTS);
  const row = dense ? "px-3 py-1.5" : "px-3 py-2.5";
  const kpis = [
    { label: "Open leads", value: "9", note: "+2 this week" },
    { label: "Appraisals this week", value: "5", note: "2 today" },
    { label: "Won this month", value: "3", note: "£405 / mo in fees" },
    { label: "Lead to appraisal", value: "62%", note: "last 30 days" },
    {
      label: "Overdue actions",
      value: String(count("overdue")),
      note: "yours",
      tone: "text-destructive",
    },
    {
      label: "No next action",
      value: String(unactioned.length),
      note: "needs you",
      tone: "text-warning",
    },
  ];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <ul
        aria-label="Headline numbers"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6"
      >
        {kpis.map((kpi) => (
          <li
            key={kpi.label}
            className={cn(
              "min-w-0 rounded-xl bg-card shadow-xs ring-1 ring-foreground/10",
              dense ? "px-3 py-2" : "px-4 py-3",
            )}
          >
            <p className="truncate text-xs text-muted-foreground">
              {kpi.label}
            </p>
            <p className={cn("text-xl font-semibold tabular-nums", kpi.tone)}>
              {kpi.value}
            </p>
            <p className="truncate text-xs text-muted-foreground">{kpi.note}</p>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Panel
          title="Needs attention"
          right={<Badge variant="secondary">{alerts.length}</Badge>}
        >
          {alerts.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Nothing needs attention.
            </p>
          ) : (
            <ul className="divide-y">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className={cn("flex items-center gap-2", row)}
                >
                  <AlertTriangle
                    aria-hidden="true"
                    className={cn(
                      "size-4 shrink-0",
                      alert.preview ? "text-muted-foreground" : "text-warning",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{alert.text}</p>
                    {alert.preview && (
                      <p className="text-xs text-muted-foreground">
                        Preview · {alert.preview}
                      </p>
                    )}
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      toast(`${alert.action}: ${alert.text}`);
                      setAlerts((list) =>
                        list.filter((item) => item.id !== alert.id),
                      );
                    }}
                  >
                    {alert.action}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Today's schedule"
          right={
            <Button size="xs" variant="ghost" onClick={() => go("schedule")}>
              Plan the day
            </Button>
          }
        >
          <ol className="divide-y">
            {SCHEDULE.map((visit) => (
              <li key={visit.id} className={cn("flex items-center gap-3", row)}>
                <span className="w-11 shrink-0 text-sm font-semibold tabular-nums">
                  {visit.time}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{visit.who}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin aria-hidden="true" className="size-3" />
                    {visit.place}
                  </p>
                </div>
                {recorded.includes(visit.id) ? (
                  <Badge variant="success">Recorded</Badge>
                ) : (
                  <Button size="xs" onClick={() => setOutcomeFor(visit.id)}>
                    <FileText aria-hidden="true" />
                    Outcome
                  </Button>
                )}
              </li>
            ))}
          </ol>
        </Panel>

        <Panel
          title="Pipeline"
          right={
            <Button size="xs" variant="ghost" onClick={() => go("pipeline")}>
              Open board
            </Button>
          }
        >
          <ul className="grid gap-1 p-2">
            {STAGES.map((stage) => {
              const n = PIPELINE.filter(
                (lead) => lead.stage === stage.id,
              ).length;
              return (
                <li key={stage.id} className="grid gap-1 px-1 py-1">
                  <div className="flex items-center text-sm">
                    <span className="flex-1">{stage.label}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {stage.value}
                    </span>
                    <span className="w-6 text-right font-semibold tabular-nums">
                      {n}
                    </span>
                  </div>
                  <Segments
                    filled={n * 2}
                    total={14}
                    label={`${n} leads at ${stage.label}`}
                  />
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Recent activity">
          <ul className="divide-y">
            {ACTIVITY.map((item, index) => (
              <li key={index} className={cn("flex items-start gap-2.5", row)}>
                <Avatar person={personById(item.who)} className="mt-0.5" />
                <p className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">
                    {personById(item.who).name}
                  </span>{" "}
                  {item.text}
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.when}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel
        title="Coming with later modules"
        right={<Badge variant="outline">Preview</Badge>}
      >
        <ul className="grid gap-2 p-2 sm:grid-cols-2 2xl:grid-cols-4">
          {[
            {
              icon: Building2,
              label: "Viewings today",
              value: "4",
              phase: "Phase 2",
            },
            {
              icon: FileText,
              label: "Applications to progress",
              value: "3",
              phase: "Phase 3",
            },
            {
              icon: AlertTriangle,
              label: "Certificates expiring (30 days)",
              value: "6",
              phase: "Phase 4",
            },
            {
              icon: Home,
              label: "Rent overdue",
              value: "£2,150",
              phase: "Phase 4",
            },
          ].map((tile) => (
            <li
              key={tile.label}
              className="flex items-center gap-3 rounded-lg border border-dashed p-3"
            >
              <tile.icon
                aria-hidden="true"
                className="size-5 text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">
                  {tile.label}
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {tile.value}
                </p>
              </div>
              <Badge variant="secondary">{tile.phase}</Badge>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function PipelineTab({
  dense,
  toast,
}: {
  dense: boolean;
  toast: (message: string, undo?: () => void) => void;
}) {
  const [leads, setLeads] = useState(PIPELINE);
  const order: StageId[] = ["new", "booked", "completed"];
  function advance(lead: PipelineLead) {
    const next = order[order.indexOf(lead.stage) + 1];
    const before = leads;
    if (!next) {
      setLeads((list) => list.filter((item) => item.id !== lead.id));
      toast(`${lead.name}: won. Ready for an instruction.`, () =>
        setLeads(before),
      );
      return;
    }
    setLeads((list) =>
      list.map((item) =>
        item.id === lead.id ? { ...item, stage: next, days: 0 } : item,
      ),
    );
    toast(`${lead.name} moved on`, () => setLeads(before));
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
      {STAGES.map((stage, index) => {
        const rows = leads.filter((lead) => lead.stage === stage.id);
        return (
          <Panel
            key={stage.id}
            title={stage.label}
            right={<Badge variant="secondary">{rows.length}</Badge>}
          >
            <ul className="divide-y">
              {rows.map((lead) => (
                <li
                  key={lead.id}
                  className={cn(
                    "flex items-center gap-2",
                    dense ? "px-2 py-1.5" : "px-2 py-2.5",
                  )}
                >
                  <Avatar person={personById(lead.owner)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{lead.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.place}
                    </p>
                  </div>
                  {lead.days >= 4 && (
                    <Badge variant={lead.days >= 7 ? "destructive" : "warning"}>
                      {lead.days}d
                    </Badge>
                  )}
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => advance(lead)}
                    aria-label={`${index === 2 ? "Mark won" : "Move on"}: ${lead.name}`}
                  >
                    {index === 2 ? "Won" : "Move on"}
                  </Button>
                </li>
              ))}
              {rows.length === 0 && (
                <li className="px-3 py-4 text-sm text-muted-foreground">
                  Empty.
                </li>
              )}
            </ul>
          </Panel>
        );
      })}
    </div>
  );
}

function ScheduleTab({ state }: { state: State }) {
  const { allTasks, recorded, setOutcomeFor, api } = state;
  const visitAt = (hour: string) =>
    SCHEDULE.find((visit) => visit.time.slice(0, 2) === hour.slice(0, 2));
  const plannedAt = (hour: string) =>
    allTasks.find((task) => task.slot === hour && task.state === "open");
  return (
    <Panel
      title="Friday 16 October"
      right={
        <span className="text-xs text-muted-foreground">
          Plan work from the Actions list
        </span>
      }
    >
      <ol className="grid gap-1 p-2">
        {HOURS.map((hour) => {
          const visit = visitAt(hour);
          const task = plannedAt(hour);
          return (
            <li
              key={hour}
              className="grid grid-cols-[3rem_minmax(0,1fr)] gap-2"
            >
              <span className="pt-2 text-xs font-semibold tabular-nums text-muted-foreground">
                {hour}
              </span>
              {visit ? (
                <div className="flex items-center gap-2 rounded-lg bg-info-soft p-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-info">
                      {visit.time} · {visit.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {visit.who} · {visit.place}
                    </p>
                  </div>
                  {recorded.includes(visit.id) ? (
                    <Badge variant="success">Recorded</Badge>
                  ) : (
                    <Button size="xs" onClick={() => setOutcomeFor(visit.id)}>
                      Outcome
                    </Button>
                  )}
                </div>
              ) : task ? (
                <div className="flex items-center gap-2 rounded-lg bg-card p-2 ring-1 ring-foreground/10">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    aria-label={`Mark done: ${task.title}`}
                    onClick={() => api.complete(task)}
                    className="rounded-full"
                  >
                    <CheckCircle2 aria-hidden="true" />
                  </Button>
                  <p className="min-w-0 flex-1 truncate text-sm">
                    {task.title}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Take ${task.title} out of the plan`}
                    onClick={() => api.unplan(task)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                  Free
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

function TeamTab({
  dense,
  toast,
}: {
  dense: boolean;
  toast: (message: string) => void;
}) {
  const rows = STAFF.map((person) => {
    const mine = PIPELINE.filter((lead) => lead.owner === person.id);
    return {
      person,
      open: mine.length,
      late: mine.filter((lead) => lead.days >= 7).length,
    };
  });
  return (
    <Panel
      title="Team workload"
      right={<Badge variant="secondary">Branch managers and owners</Badge>}
    >
      <ul className="divide-y">
        {rows.map((row) => (
          <li
            key={row.person.id}
            className={cn(
              "grid items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]",
              dense ? "px-3 py-2" : "px-3 py-3.5",
            )}
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <Avatar person={row.person} />
              <span className="truncate">{row.person.name}</span>
            </span>
            <Segments
              filled={row.open * 2}
              total={14}
              tone={row.late ? "warning" : "primary"}
              label={`${row.person.name} has ${row.open} open leads`}
            />
            <span className="flex items-center gap-2">
              <span className="text-xs tabular-nums text-muted-foreground">
                {row.open} open
              </span>
              {row.late > 0 && (
                <Badge variant="destructive">{row.late} stale</Badge>
              )}
              <Button
                size="xs"
                variant="outline"
                onClick={() =>
                  toast(`Nudge sent to ${row.person.name} (mock-up)`)
                }
              >
                Nudge
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** The always-visible Actions list on the right. */
function ActionsRail({ state, dense }: { state: State; dense: boolean }) {
  const { allTasks, api } = state;
  const [filter, setFilter] = useState<RailFilter>("all");
  const open = allTasks.filter((task) => task.state === "open");
  // Due order: the most overdue at the top.
  const shown = sortByDue(
    allTasks.filter((task) => filter === "all" || task.group === filter),
  );
  const free = HOURS.filter(
    (hour) =>
      !SCHEDULE.some((visit) => visit.time.slice(0, 2) === hour.slice(0, 2)) &&
      !allTasks.some((task) => task.slot === hour && task.state === "open"),
  );
  return (
    <aside
      aria-label="Actions"
      className="order-first min-w-0 rounded-xl bg-card shadow-xs ring-1 ring-foreground/10 xl:order-none xl:sticky xl:top-28 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto"
    >
      <div className="sticky top-0 z-[1] grid gap-2 border-b bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Actions</h2>
          <Badge variant="secondary" className="tabular-nums">
            {open.length}
          </Badge>
          <span className="ml-auto">
            <AddActionDialog onAdd={api.addTask} />
          </span>
        </div>
        <FilterChips
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "All" },
            {
              id: "overdue",
              label: "Overdue",
              count: open.filter((t) => t.group === "overdue").length,
            },
            {
              id: "today",
              label: "Today",
              count: open.filter((t) => t.group === "today").length,
            },
          ]}
        />
      </div>
      <ul className="divide-y">
        {shown.map((task) =>
          task.state === "done" ? (
            <li key={task.id} className="p-2">
              <DoneRow task={task} api={api} />
            </li>
          ) : (
            <RailRow
              key={task.id}
              task={task}
              free={free}
              state={state}
              dense={dense}
            />
          ),
        )}
        {shown.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing here.
          </li>
        )}
      </ul>
    </aside>
  );
}

function RailRow({
  task,
  free,
  state,
  dense,
}: {
  task: Task;
  free: string[];
  state: State;
  dense: boolean;
}) {
  const { api } = state;
  return (
    <li className={cn("flex items-start gap-2 px-3", dense ? "py-2" : "py-3")}>
      <Button
        variant="outline"
        size="icon-xs"
        aria-label={`Mark done: ${task.title}`}
        onClick={() => api.complete(task)}
        className="mt-0.5 rounded-full"
      >
        <CheckCircle2 aria-hidden="true" />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          <span className="truncate">{task.lead}</span>
          {task.module !== "leads" && (
            <Badge variant="outline" className="h-4 px-1.5 text-[0.65rem]">
              {MODULE_LABEL[task.module]}
            </Badge>
          )}
        </p>
        <div className="mt-0.5">
          {task.slot ? (
            <Badge variant="info">Planned {task.slot}</Badge>
          ) : (
            <DueBadge task={task} />
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <ContactButton task={task} api={api} iconOnly />
        <ActionMenu
          label={`Plan ${task.title} into the day`}
          icon={CalendarClock}
          text="Plan"
          items={
            free.length
              ? free.slice(0, 6).map((hour) => ({
                  label: `Plan for ${hour}`,
                  icon: CalendarClock,
                  onSelect: () => api.schedule(task, hour),
                }))
              : [{ label: "No free hours today", onSelect: () => undefined }]
          }
        />
        <RowMenu task={task} api={api} />
      </div>
    </li>
  );
}

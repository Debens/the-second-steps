"use client";

import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  FileText,
  MapPin,
  X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionMenu, FilterChips, SectionHeading } from "./shared";
import {
  ContactButton,
  DoneRow,
  DueBadge,
  GROUP_TITLE,
  KIND_ICON,
  MODULE_LABEL,
  NEXT_STEPS,
  RowMenu,
  SCHEDULE,
  type Group,
  type Module,
  type Task,
  type useOverviewState,
} from "./overview-state";

type State = ReturnType<typeof useOverviewState>;
type Filter = "all" | Module;

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

/**
 * F: the inbox (A) with the day plan (E) beside it. Work from every part of the
 * product lands in one list; planning a row drops it into a free hour.
 */
export function OverviewCombined({ state }: { state: State }) {
  const { allTasks, recorded, setOutcomeFor, unactioned, api } = state;
  const [filter, setFilter] = useState<Filter>("all");

  const open = allTasks.filter((task) => task.state === "open");
  const inFilter = (task: Task) => filter === "all" || task.module === filter;
  const countFor = (module: Module) =>
    open.filter((task) => task.module === module).length;

  const visitAt = (hour: string) =>
    SCHEDULE.find((visit) => visit.time.slice(0, 2) === hour.slice(0, 2));
  const plannedAt = (hour: string) =>
    allTasks.find((task) => task.slot === hour && task.state === "open");
  const free = HOURS.filter((hour) => !visitAt(hour) && !plannedAt(hour));
  const previewShown = filter !== "all" && filter !== "leads";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <FilterChips
        label="Show work from"
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "Everything", count: open.length },
          { id: "leads", label: "Landlord leads", count: countFor("leads") },
          { id: "viewings", label: "Viewings", count: countFor("viewings") },
          {
            id: "pretenancy",
            label: "Pre-tenancy",
            count: countFor("pretenancy"),
          },
          {
            id: "maintenance",
            label: "Maintenance",
            count: countFor("maintenance"),
          },
        ]}
      />
      {(filter === "all" || previewShown) && (
        <p className="rounded-xl bg-info-soft px-4 py-2.5 text-xs text-info">
          Preview: viewings, pre-tenancy and maintenance are not built yet. A
          few sample items are mixed in to show that one list and one day plan
          can hold work from every part of the product.
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-8">
          {(["overdue", "today", "week"] as const).map((group) => (
            <Section
              key={group}
              group={group}
              tasks={allTasks.filter(
                (task) => task.group === group && inFilter(task),
              )}
              free={free}
              state={state}
            />
          ))}
          {open.filter(inFilter).length === 0 && (
            <p className="rounded-xl bg-success-soft p-6 text-center text-sm text-success">
              <CheckCircle2
                aria-hidden="true"
                className="mx-auto mb-2 size-6"
              />
              Nothing here. Nice work.
            </p>
          )}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-8">
          <section aria-label="Your day">
            <SectionHeading title="Your day">
              <Badge variant="secondary">{free.length} free hours</Badge>
            </SectionHeading>
            <ol className="grid gap-1 pt-3">
              {HOURS.map((hour) => {
                const visit = visitAt(hour);
                const task = plannedAt(hour);
                return (
                  <li
                    key={hour}
                    className="grid grid-cols-[3rem_minmax(0,1fr)] items-stretch gap-2"
                  >
                    <span className="pt-2.5 text-xs font-semibold tabular-nums text-muted-foreground">
                      {hour}
                    </span>
                    {visit ? (
                      <div className="flex items-center gap-2 rounded-lg bg-info-soft p-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-info">
                            {visit.time} · {visit.who}
                          </p>
                          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin aria-hidden="true" className="size-3" />
                            {visit.place}
                          </p>
                        </div>
                        {recorded.includes(visit.id) ? (
                          <Badge variant="success">Recorded</Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setOutcomeFor(visit.id)}
                          >
                            <FileText aria-hidden="true" />
                            Outcome
                          </Button>
                        )}
                      </div>
                    ) : task ? (
                      <div className="flex items-center gap-2 rounded-lg bg-card p-2.5 shadow-xs ring-1 ring-foreground/10">
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
                      <div className="rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
                        Free
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-label="Leads needing a next action">
            <SectionHeading
              title="Needs a next action"
              count={unactioned.length}
              tone="warning"
            />
            {unactioned.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                Every lead has a next action.
              </p>
            ) : (
              <ul className="divide-y">
                {unactioned.map((lead) => (
                  <li key={lead.id} className="grid gap-2 py-3">
                    <p className="text-sm font-medium">
                      {lead.lead}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {lead.ago}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {NEXT_STEPS.slice(0, 2).map((step) => (
                        <Button
                          key={step.id}
                          size="xs"
                          variant="outline"
                          onClick={() => api.addNext(lead, step)}
                        >
                          {step.label}
                        </Button>
                      ))}
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => api.book(lead.lead)}
                      >
                        <CalendarPlus aria-hidden="true" />
                        Book appraisal
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Section({
  group,
  tasks,
  free,
  state,
}: {
  group: Group;
  tasks: Task[];
  free: string[];
  state: State;
}) {
  const { api } = state;
  if (!tasks.length) return null;
  return (
    <section aria-label={GROUP_TITLE[group]}>
      <SectionHeading
        title={GROUP_TITLE[group]}
        count={tasks.filter((task) => task.state === "open").length}
        tone={group === "overdue" ? "destructive" : undefined}
      />
      <ul className="divide-y">
        {tasks.map((task) => {
          if (task.state === "done") {
            return (
              <li key={task.id} className="py-2">
                <DoneRow task={task} api={api} />
              </li>
            );
          }
          const Icon = KIND_ICON[task.kind];
          return (
            <li key={task.id} className="flex items-start gap-3 py-3">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={`Mark done: ${task.title}`}
                onClick={() => api.complete(task)}
                className="mt-0.5 rounded-full"
              >
                <CheckCircle2 aria-hidden="true" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Icon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 truncate">{task.title}</span>
                </p>
                <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span className="truncate">
                    {task.lead} · {task.place}
                  </span>
                  <Badge
                    variant="outline"
                    className="h-4 px-1.5 text-[0.65rem]"
                  >
                    {MODULE_LABEL[task.module]}
                  </Badge>
                </p>
              </div>
              <span className="hidden shrink-0 sm:inline-flex">
                {task.slot ? (
                  <Badge variant="info">
                    <CalendarClock
                      aria-hidden="true"
                      data-icon="inline-start"
                    />
                    Planned {task.slot}
                  </Badge>
                ) : (
                  <DueBadge task={task} />
                )}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <ContactButton task={task} api={api} />
                <ActionMenu
                  text="Plan"
                  icon={CalendarClock}
                  label={`Plan ${task.title} into the day`}
                  items={
                    free.length
                      ? free.slice(0, 6).map((hour) => ({
                          label: `Plan for ${hour}`,
                          icon: CalendarClock,
                          onSelect: () => api.schedule(task, hour),
                        }))
                      : [
                          {
                            label: "No free hours today",
                            onSelect: () => undefined,
                          },
                        ]
                  }
                />
                <RowMenu task={task} api={api} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

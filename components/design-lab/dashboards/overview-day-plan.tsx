"use client";

import { CalendarClock, CheckCircle2, FileText, MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionMenu, SectionHeading } from "./shared";
import {
  ContactButton,
  DoneRow,
  DueBadge,
  RowMenu,
  SCHEDULE,
  type Task,
  type useOverviewState,
} from "./overview-state";

type State = ReturnType<typeof useOverviewState>;
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

/** E: the day laid out by the hour, with the backlog beside it to drop into free time. */
export function OverviewDayPlan({ state }: { state: State }) {
  const { tasks, open, recorded, setOutcomeFor, api } = state;
  const visitAt = (hour: string) =>
    SCHEDULE.find((visit) => visit.time.slice(0, 2) === hour.slice(0, 2));
  const planned = (hour: string) =>
    tasks.find((task) => task.slot === hour && task.state === "open");
  const taken = new Set(HOURS.filter((hour) => visitAt(hour) || planned(hour)));
  const backlog = open.filter((task) => !task.slot);
  const free = HOURS.filter((hour) => !taken.has(hour));

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <section aria-label="Your day">
        <SectionHeading
          title="Your day"
          count={SCHEDULE.length + open.filter((task) => task.slot).length}
        >
          <Badge variant="secondary">{free.length} free hours</Badge>
        </SectionHeading>
        <ol className="grid gap-1.5 pt-3">
          {HOURS.map((hour) => {
            const visit = visitAt(hour);
            const task = planned(hour);
            return (
              <li
                key={hour}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-stretch gap-3"
              >
                <span className="pt-3 text-sm font-semibold tabular-nums text-muted-foreground">
                  {hour}
                </span>
                {visit ? (
                  <div className="grid gap-2 rounded-xl bg-info-soft p-3 sm:flex sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-info">
                        {visit.time} · {visit.title}
                      </p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin aria-hidden="true" className="size-3" />
                        {visit.who} · {visit.place}
                      </p>
                    </div>
                    {recorded.includes(visit.id) ? (
                      <Badge variant="success">
                        <CheckCircle2
                          aria-hidden="true"
                          data-icon="inline-start"
                        />
                        Recorded
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => setOutcomeFor(visit.id)}>
                        <FileText aria-hidden="true" />
                        Record outcome
                      </Button>
                    )}
                  </div>
                ) : task ? (
                  <div className="flex items-center gap-2 rounded-xl bg-card p-3 shadow-xs ring-1 ring-foreground/10">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Mark done: ${task.title}`}
                      onClick={() => api.complete(task)}
                      className="rounded-full"
                    >
                      <CheckCircle2 aria-hidden="true" />
                    </Button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {task.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {task.lead}
                      </p>
                    </div>
                    <ContactButton task={task} api={api} />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Take ${task.title} out of the plan`}
                      onClick={() => api.snooze(task, "Today (unplanned)")}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                    Free
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-label="To plan">
        <SectionHeading title="To plan" count={backlog.length} tone="warning" />
        <ul className="divide-y">
          {tasks
            .filter((task) => !task.slot)
            .map((task) =>
              task.state === "done" ? (
                <li key={task.id} className="py-2">
                  <DoneRow task={task} api={api} />
                </li>
              ) : (
                <BacklogRow
                  key={task.id}
                  task={task}
                  free={free}
                  state={state}
                />
              ),
            )}
        </ul>
        {backlog.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">
            Nothing left to plan.
          </p>
        )}
      </section>
    </div>
  );
}

function BacklogRow({
  task,
  free,
  state,
}: {
  task: Task;
  free: string[];
  state: State;
}) {
  const { api } = state;
  return (
    <li className="flex items-start gap-2 py-3">
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
        <p className="truncate text-sm font-medium">{task.title}</p>
        <p className="truncate text-xs text-muted-foreground">{task.lead}</p>
        <div className="mt-1">
          <DueBadge task={task} />
        </div>
      </div>
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
            : [{ label: "No free hours today", onSelect: () => undefined }]
        }
      />
      <RowMenu task={task} api={api} />
    </li>
  );
}

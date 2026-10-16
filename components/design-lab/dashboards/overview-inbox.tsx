"use client";

import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  FileText,
  MapPin,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "./shared";
import {
  ContactButton,
  DoneRow,
  DueBadge,
  GROUP_TITLE,
  KIND_ICON,
  NEXT_STEPS,
  RowMenu,
  SCHEDULE,
  type Group,
  type OverviewApi,
  type Task,
  type useOverviewState,
} from "./overview-state";

type State = ReturnType<typeof useOverviewState>;

/** A: one ranked inbox, with today's schedule and gaps in a side rail. */
export function OverviewInbox({ state }: { state: State }) {
  const { tasks, unactioned, recorded, api, setOutcomeFor, open } = state;
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid content-start gap-8">
        {(["overdue", "today", "week"] as const).map((group) => (
          <GroupSection
            key={group}
            group={group}
            tasks={tasks.filter((task) => task.group === group)}
            api={api}
          />
        ))}
        {open.length === 0 && (
          <p className="rounded-xl bg-success-soft p-6 text-center text-sm text-success">
            <CheckCircle2 aria-hidden="true" className="mx-auto mb-2 size-6" />
            Everything is done for now. Nice work.
          </p>
        )}
      </div>

      <div className="grid content-start gap-8">
        <section aria-label="Today's schedule">
          <SectionHeading title="Today's schedule" count={SCHEDULE.length} />
          <ol className="divide-y">
            {SCHEDULE.map((visit) => (
              <li key={visit.id} className="grid gap-2 py-3">
                <div className="flex items-start gap-3">
                  <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">
                    {visit.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{visit.title}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <UserRound aria-hidden="true" className="size-3" />
                      {visit.who}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin aria-hidden="true" className="size-3" />
                      {visit.place}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-15">
                  {recorded.includes(visit.id) ? (
                    <Badge variant="success">
                      <CheckCircle2
                        aria-hidden="true"
                        data-icon="inline-start"
                      />
                      Outcome recorded
                    </Badge>
                  ) : (
                    <Button size="sm" onClick={() => setOutcomeFor(visit.id)}>
                      <FileText aria-hidden="true" />
                      Record outcome
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => api.info("Opening directions (mock-up)")}
                  >
                    <MapPin aria-hidden="true" />
                    Directions
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      api.info(`Rescheduling ${visit.who}'s visit (mock-up)`)
                    }
                  >
                    <CalendarClock aria-hidden="true" />
                    Reschedule
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Leads needing a next action">
          <SectionHeading
            title="Needs a next action"
            count={unactioned.length}
            tone="warning"
          />
          {unactioned.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Every lead has a next action.
            </p>
          ) : (
            <ul className="divide-y">
              {unactioned.map((lead) => (
                <li key={lead.id} className="grid gap-2 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{lead.lead}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.place} · {lead.ago}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {NEXT_STEPS.map((step) => (
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
  );
}

function GroupSection({
  group,
  tasks,
  api,
}: {
  group: Group;
  tasks: Task[];
  api: OverviewApi;
}) {
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
                    className="size-4 text-muted-foreground"
                  />
                  <span className="min-w-0 truncate">{task.title}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {task.lead} · {task.place}
                </p>
              </div>
              <span className="hidden shrink-0 sm:inline-flex">
                <DueBadge task={task} />
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <ContactButton task={task} api={api} />
                <RowMenu task={task} api={api} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

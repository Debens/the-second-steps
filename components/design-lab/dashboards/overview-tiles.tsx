"use client";

import {
  AlarmClock,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Inbox,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { KpiTile } from "./shared";
import {
  ContactButton,
  DoneRow,
  NEXT_STEPS,
  RowMenu,
  SCHEDULE,
  type Group,
  type OverviewApi,
  type Task,
  type useOverviewState,
} from "./overview-state";

type State = ReturnType<typeof useOverviewState>;

/** D: the current Overview cards, made actionable, with headline numbers on top. */
export function OverviewTiles({ state }: { state: State }) {
  const { tasks, unactioned, recorded, setOutcomeFor, count, api } = state;
  return (
    <div className="grid gap-6">
      <section
        aria-label="Headlines"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <KpiTile
          label="Overdue"
          value={String(count("overdue"))}
          tone={count("overdue") ? "destructive" : "default"}
        />
        <KpiTile label="Due today" value={String(count("today"))} />
        <KpiTile
          label="Appraisals today"
          value={String(SCHEDULE.length)}
          tone="success"
        />
        <KpiTile
          label="Leads without a next action"
          value={String(unactioned.length)}
          tone={unactioned.length ? "warning" : "default"}
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TaskCard
          title="Overdue actions"
          icon={AlarmClock}
          tone="text-destructive"
          group="overdue"
          tasks={tasks}
          api={api}
        />
        <TaskCard
          title="Due today"
          icon={Clock}
          tone="text-primary"
          group="today"
          tasks={tasks}
          api={api}
        />
        <Card className="min-w-0">
          <div className="flex items-center justify-between px-4">
            <CardTitle className="text-sm font-medium">
              Today&apos;s appraisals
            </CardTitle>
            <CalendarCheck aria-hidden="true" className="size-4 text-info" />
          </div>
          <CardContent>
            <ul className="divide-y">
              {SCHEDULE.map((visit) => (
                <li
                  key={visit.id}
                  className="flex items-center gap-3 py-3 first:pt-0"
                >
                  <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">
                    {visit.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{visit.who}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {visit.place}
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
                      Record outcome
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <div className="flex items-center justify-between px-4">
            <CardTitle className="text-sm font-medium">
              Needs a next action
            </CardTitle>
            <Inbox aria-hidden="true" className="size-4 text-warning" />
          </div>
          <CardContent>
            {unactioned.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Every lead has a next action.
              </p>
            ) : (
              <ul className="divide-y">
                {unactioned.map((lead) => (
                  <li key={lead.id} className="grid gap-2 py-3 first:pt-0">
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
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <TaskCard
          title="Coming up"
          icon={Trophy}
          tone="text-muted-foreground"
          group="week"
          tasks={tasks}
          api={api}
        />
      </div>
    </div>
  );
}

function TaskCard({
  title,
  icon: Icon,
  tone,
  group,
  tasks,
  api,
}: {
  title: string;
  icon: typeof Clock;
  tone: string;
  group: Group;
  tasks: Task[];
  api: OverviewApi;
}) {
  const [all, setAll] = useState(false);
  const rows = tasks.filter((task) => task.group === group);
  const openCount = rows.filter((task) => task.state === "open").length;
  const shown = all ? rows : rows.slice(0, 3);
  return (
    <Card className="min-w-0">
      <div className="flex items-center justify-between px-4">
        <CardTitle className="text-sm font-medium">
          {title}{" "}
          <Badge variant="secondary" className="ml-1 tabular-nums">
            {openCount}
          </Badge>
        </CardTitle>
        <Icon aria-hidden="true" className={`size-4 ${tone}`} />
      </div>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          <ul className="divide-y">
            {shown.map((task) =>
              task.state === "done" ? (
                <li key={task.id} className="py-2 first:pt-0">
                  <DoneRow task={task} api={api} />
                </li>
              ) : (
                <li
                  key={task.id}
                  className="flex items-center gap-2 py-3 first:pt-0"
                >
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
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {task.lead} · {task.due}
                    </p>
                  </div>
                  <ContactButton task={task} api={api} />
                  <RowMenu task={task} api={api} />
                </li>
              ),
            )}
          </ul>
        )}
        {rows.length > 3 && (
          <Button
            variant="link"
            size="sm"
            className="mt-2 px-0"
            onClick={() => setAll((value) => !value)}
          >
            {all ? "Show fewer" : `Show all ${rows.length}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

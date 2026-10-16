"use client";

import {
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  SkipForward,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segments } from "./shared";
import {
  ContactButton,
  DoneRow,
  DueBadge,
  KIND_ICON,
  RowMenu,
  SCHEDULE,
  type Task,
  type useOverviewState,
} from "./overview-state";

type State = ReturnType<typeof useOverviewState>;
const RANK = { overdue: 0, today: 1, week: 2 } as const;

/** B: one thing at a time. Clear the card in front of you, then the next. */
export function OverviewFocus({ state }: { state: State }) {
  const { tasks, open, api } = state;
  const [skipped, setSkipped] = useState<string[]>([]);
  const [justDone, setJustDone] = useState<string | null>(null);
  const [front, setFront] = useState<string | null>(null);

  const queue = [...open].sort(
    (a, b) =>
      Number(b.id === front) - Number(a.id === front) ||
      RANK[a.group] - RANK[b.group] ||
      skipped.indexOf(a.id) - skipped.indexOf(b.id),
  );
  const current = queue[0];
  const finished = tasks.filter((task) => task.state === "done").length;
  const total = tasks.length;
  const doneTask = tasks.find(
    (task) => task.id === justDone && task.state === "done",
  );

  function skip(task: Task) {
    setSkipped((list) => [...list.filter((id) => id !== task.id), task.id]);
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid content-start gap-6">
        <div className="grid gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {open.length === 0
                ? "All clear"
                : `${open.length} to go · ${finished} done today`}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {finished} of {total}
            </span>
          </div>
          <Segments
            filled={Math.round((finished / Math.max(1, total)) * 12)}
            tone="success"
            label={`${finished} of ${total} actions done`}
          />
        </div>

        {doneTask ? (
          <section
            aria-label="Next step"
            className="rounded-2xl bg-card p-6 shadow-xs ring-1 ring-foreground/10"
          >
            <DoneRow task={doneTask} api={api} />
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setJustDone(null)}>
                Skip to next card
              </Button>
            </div>
          </section>
        ) : current ? (
          <section
            aria-label="Do this next"
            className="grid gap-5 rounded-2xl bg-card p-6 shadow-xs ring-1 ring-foreground/10"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">Do this next</Badge>
              <DueBadge task={current} />
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                {(() => {
                  const Icon = KIND_ICON[current.kind];
                  return (
                    <Icon
                      aria-hidden="true"
                      className="size-5 text-muted-foreground"
                    />
                  );
                })()}
                {current.title}
              </h2>
              <p className="mt-1 text-sm">{current.lead}</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin aria-hidden="true" className="size-3.5" />
                {current.place}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="lg"
                onClick={() => {
                  api.complete(current);
                  setJustDone(current.id);
                }}
              >
                <CheckCircle2 aria-hidden="true" />
                Done
              </Button>
              <ContactButton task={current} api={api} />
              <Button
                variant="outline"
                onClick={() => api.snooze(current, "Tomorrow")}
              >
                <Clock aria-hidden="true" />
                Tomorrow
              </Button>
              <Button variant="ghost" onClick={() => skip(current)}>
                <SkipForward aria-hidden="true" />
                Not now
              </Button>
              <RowMenu task={current} api={api} />
            </div>
          </section>
        ) : (
          <p className="rounded-2xl bg-success-soft p-10 text-center text-success">
            <CheckCircle2 aria-hidden="true" className="mx-auto mb-3 size-8" />
            You are all caught up.
          </p>
        )}

        {queue.length > 1 && (
          <section aria-label="Up next">
            <h2 className="mb-2 border-b pb-2 text-sm font-semibold">
              Up next
            </h2>
            <ul className="divide-y">
              {queue.slice(1, 5).map((task) => (
                <li key={task.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {task.lead} · {task.due}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setJustDone(null);
                      setFront(task.id);
                    }}
                  >
                    Do first
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside aria-label="Today's visits" className="grid content-start gap-3">
        <h2 className="border-b pb-2 text-sm font-semibold">
          Today&apos;s visits
        </h2>
        <ol className="grid gap-3">
          {SCHEDULE.map((visit) => (
            <li key={visit.id} className="flex items-start gap-3 text-sm">
              <span className="w-12 shrink-0 font-semibold tabular-nums">
                {visit.time}
              </span>
              <div className="min-w-0">
                <p className="font-medium">{visit.who}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {visit.place}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <Button
          variant="outline"
          onClick={() => api.info("Opening the calendar (mock-up)")}
        >
          <CalendarClock aria-hidden="true" />
          Open calendar
        </Button>
      </aside>
    </div>
  );
}

"use client";

import { CheckCircle2, Clock, Send, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ActionMenu, FilterChips, STAFF } from "./shared";
import {
  ContactButton,
  DoneRow,
  DueBadge,
  GROUP_TITLE,
  KIND_ICON,
  NEXT_STEPS,
  RowMenu,
  type useOverviewState,
} from "./overview-state";

type State = ReturnType<typeof useOverviewState>;
type Filter = "all" | "overdue" | "today" | "week";

/** C: a dense, sortable-feeling table with bulk actions, for people who clear lots at once. */
export function OverviewTable({ state }: { state: State }) {
  const { tasks, open, unactioned, count, api } = state;
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string[]>([]);

  const rows = tasks.filter(
    (task) => filter === "all" || task.group === filter,
  );
  const openRows = rows.filter((task) => task.state === "open");
  const picked = selected.filter((id) => open.some((task) => task.id === id));
  const allPicked =
    openRows.length > 0 && openRows.every((task) => picked.includes(task.id));

  function toggle(id: string) {
    setSelected((list) =>
      list.includes(id) ? list.filter((item) => item !== id) : [...list, id],
    );
  }

  return (
    <div className="grid gap-5">
      {unactioned.length > 0 && (
        <section
          aria-label="Leads needing a next action"
          className="flex flex-col gap-2 rounded-xl bg-warning-soft p-3 text-sm lg:flex-row lg:items-center"
        >
          <span className="font-medium text-warning">
            {unactioned.length} lead{unactioned.length === 1 ? "" : "s"} need a
            next action:
          </span>
          <div className="flex flex-1 flex-wrap gap-x-4 gap-y-2">
            {unactioned.map((lead) => (
              <span
                key={lead.id}
                className="flex flex-wrap items-center gap-1.5"
              >
                <span className="font-medium">{lead.lead}</span>
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
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <FilterChips
          label="Show"
          value={filter}
          onChange={(next) => {
            setFilter(next);
            setSelected([]);
          }}
          options={[
            { id: "all", label: "All", count: open.length },
            { id: "overdue", label: "Overdue", count: count("overdue") },
            { id: "today", label: "Today", count: count("today") },
            { id: "week", label: "Coming up", count: count("week") },
          ]}
        />
        <div
          className="ml-auto flex flex-wrap items-center gap-2"
          aria-live="polite"
        >
          {picked.length > 0 ? (
            <>
              <span className="text-sm font-medium">
                {picked.length} selected
              </span>
              <Button
                size="sm"
                onClick={() => {
                  api.bulk(picked, "done");
                  setSelected([]);
                }}
              >
                <CheckCircle2 aria-hidden="true" />
                Mark done
              </Button>
              <ActionMenu
                label="Snooze selected"
                items={[
                  {
                    label: "Snooze to tomorrow",
                    icon: Clock,
                    onSelect: () => {
                      api.bulk(picked, "snooze", "Tomorrow");
                      setSelected([]);
                    },
                  },
                  {
                    label: "Snooze to next week",
                    icon: Clock,
                    onSelect: () => {
                      api.bulk(picked, "snooze", "Mon 26 Oct");
                      setSelected([]);
                    },
                  },
                  ...STAFF.filter((person) => person.id !== "olivia").map(
                    (person) => ({
                      label: `Hand to ${person.name}`,
                      icon: UserRound,
                      onSelect: () => {
                        api.bulk(picked, "reassign", person.name);
                        setSelected([]);
                      },
                    }),
                  ),
                ]}
              />
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              Tick rows to act on several at once
            </span>
          )}
        </div>
      </div>

      <Card className="hidden py-0 md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all shown"
                    className="size-4 accent-primary"
                    checked={allPicked}
                    onChange={() =>
                      setSelected(
                        allPicked ? [] : openRows.map((task) => task.id),
                      )
                    }
                  />
                </TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Lead and property</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="text-right">Do it</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((task) => {
                if (task.state === "done") {
                  return (
                    <TableRow key={task.id}>
                      <TableCell colSpan={5}>
                        <DoneRow task={task} api={api} />
                      </TableCell>
                    </TableRow>
                  );
                }
                const Icon = KIND_ICON[task.kind];
                return (
                  <TableRow
                    key={task.id}
                    data-state={
                      picked.includes(task.id) ? "selected" : undefined
                    }
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${task.title}`}
                        className="size-4 accent-primary"
                        checked={picked.includes(task.id)}
                        onChange={() => toggle(task.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <Icon
                          aria-hidden="true"
                          className="size-4 text-muted-foreground"
                        />
                        {task.title}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{task.lead}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.place}
                      </p>
                    </TableCell>
                    <TableCell>
                      <DueBadge task={task} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ContactButton task={task} api={api} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => api.complete(task)}
                        >
                          <CheckCircle2 aria-hidden="true" />
                          Done
                        </Button>
                        <RowMenu task={task} api={api} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ul className="grid gap-2 md:hidden">
        {rows.map((task) =>
          task.state === "done" ? (
            <li key={task.id}>
              <DoneRow task={task} api={api} />
            </li>
          ) : (
            <li
              key={task.id}
              className="flex items-start gap-3 rounded-xl bg-card p-3 shadow-xs ring-1 ring-foreground/10"
            >
              <input
                type="checkbox"
                aria-label={`Select ${task.title}`}
                className="mt-1 size-4 accent-primary"
                checked={picked.includes(task.id)}
                onChange={() => toggle(task.id)}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {task.lead} · {GROUP_TITLE[task.group]}, {task.due}
                </p>
              </div>
              <Button
                size="icon-sm"
                variant="outline"
                aria-label={`Mark done: ${task.title}`}
                onClick={() => api.complete(task)}
              >
                <CheckCircle2 aria-hidden="true" />
              </Button>
              <RowMenu task={task} api={api} />
            </li>
          ),
        )}
      </ul>
      {rows.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          <Send aria-hidden="true" className="mx-auto mb-2 size-5" />
          Nothing here.
        </p>
      )}
    </div>
  );
}

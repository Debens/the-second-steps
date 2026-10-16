"use client";

import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeadPipeline } from "./lead-pipeline";
import { OverviewDayPlan } from "./overview-day-plan";
import { OverviewFocus } from "./overview-focus";
import { OverviewInbox } from "./overview-inbox";
import { OutcomeSheet, SCHEDULE, useOverviewState } from "./overview-state";
import { OverviewTable } from "./overview-table";
import { OverviewTiles } from "./overview-tiles";
import { AvailabilityBadge, DesignNotes, TODAY_LABEL } from "./shared";
import { TenancyProgression } from "./tenancy-progression";

type OverviewId = "inbox" | "focus" | "table" | "tiles" | "plan";
type RoleId = "pipeline" | "progress";
type VariantId = OverviewId | RoleId;

const OVERVIEWS: {
  id: OverviewId;
  letter: string;
  label: string;
  summary: string;
  best: string;
  tradeoff: string;
}[] = [
  {
    id: "inbox",
    letter: "A",
    label: "Inbox",
    summary:
      "One ranked list: overdue first, then today, then coming up. Today's visits and leads without a next action sit in a side rail.",
    best: "Everyone. It is the closest to how people already work through email and task lists.",
    tradeoff:
      "A long backlog makes it a long page. There is no overview of the shape of the day.",
  },
  {
    id: "focus",
    letter: "B",
    label: "Focus",
    summary:
      "One card at a time. Finish it, choose what happens next, and the next card appears. A bar shows progress through the day.",
    best: "Clearing a backlog, newer staff, and mobile.",
    tradeoff:
      "You cannot see everything at once, and experienced users may find it slow.",
  },
  {
    id: "table",
    letter: "C",
    label: "Table",
    summary:
      "A dense table with tick-boxes and bulk actions: mark many done, snooze or hand them over together. Turns into cards on a phone.",
    best: "Managers and power users clearing lots of work in one go.",
    tradeoff:
      "The busiest-looking option, and the least friendly first impression.",
  },
  {
    id: "tiles",
    letter: "D",
    label: "Tiles",
    summary:
      "Today's Overview cards made actionable, with headline numbers on top. Each card shows the top three items and expands to all of them.",
    best: "Seeing every kind of work at a glance, and the least change from today.",
    tradeoff:
      "Work is split across cards, so it is harder to see one overall order of priority.",
  },
  {
    id: "plan",
    letter: "E",
    label: "Day plan",
    summary:
      "The day laid out by the hour, with appointments fixed in place. Drop backlog items into free hours from the 'To plan' list.",
    best: "People with a lot of visits, who need to fit calls and paperwork around them.",
    tradeoff:
      "Needs a real calendar behind it, and it asks people to plan, which not everyone wants.",
  },
];

const ROLES: { id: RoleId; label: string; summary: string }[] = [
  {
    id: "pipeline",
    label: "Manager pipeline",
    summary:
      "A first draft for branch managers: leads as a board, with problems lifted to the top and assign, advance and close actions on each card.",
  },
  {
    id: "progress",
    label: "Move-in progress",
    summary:
      "A first draft for the lettings coordinator (roadmap Phase 3). Blocked moves first, with the chase action next to each blocker.",
  },
];

export function DashboardLab() {
  const [variant, setVariant] = useState<VariantId>("inbox");
  const state = useOverviewState();
  const overview = OVERVIEWS.find((item) => item.id === variant);
  const role = ROLES.find((item) => item.id === variant);

  const layouts: Record<OverviewId, ReactNode> = {
    inbox: <OverviewInbox state={state} />,
    focus: <OverviewFocus state={state} />,
    table: <OverviewTable state={state} />,
    tiles: <OverviewTiles state={state} />,
    plan: <OverviewDayPlan state={state} />,
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <p className="text-sm font-semibold">Dashboard options</p>
            <p className="text-xs text-muted-foreground">
              Mock-ups with sample data. Every button works, with Undo. Try
              light and dark, and a narrow window for mobile.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <nav
          aria-label="Dashboard options"
          className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3"
        >
          <span className="flex shrink-0 items-center pr-1 text-xs font-medium text-muted-foreground">
            Overview
          </span>
          {OVERVIEWS.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={variant === item.id ? "default" : "outline"}
              aria-pressed={variant === item.id}
              onClick={() => setVariant(item.id)}
              className="shrink-0"
            >
              {item.letter}. {item.label}
            </Button>
          ))}
          <span className="mx-1 w-px shrink-0 bg-border" aria-hidden="true" />
          <span className="flex shrink-0 items-center pr-1 text-xs font-medium text-muted-foreground">
            Other roles (drafts)
          </span>
          {ROLES.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={variant === item.id ? "default" : "outline"}
              aria-pressed={variant === item.id}
              onClick={() => setVariant(item.id)}
              className="shrink-0"
            >
              {item.label}
            </Button>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {overview && (
          <div className="mb-6 grid gap-2 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
            <p>{overview.summary}</p>
            <p className="text-xs">
              <span className="font-semibold">Best for:</span> {overview.best}{" "}
              <span className="font-semibold">Trade-off:</span>{" "}
              {overview.tradeoff}
            </p>
          </div>
        )}
        {role && (
          <div className="mb-6 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
            {role.summary}
          </div>
        )}

        {overview ? (
          <div className="grid gap-6">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{TODAY_LABEL}</p>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Good morning, Olivia
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {state.count("overdue")} overdue · {state.count("today")} due
                  today · {SCHEDULE.length} appraisals ·{" "}
                  {state.unactioned.length} leads need a next action
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AvailabilityBadge value="now" />
                <Badge variant="outline">Account Owner view</Badge>
                <Button
                  onClick={() => state.api.info("Opening quick lead (mock-up)")}
                >
                  <Plus aria-hidden="true" />
                  Quick landlord lead
                </Button>
              </div>
            </header>
            {layouts[overview.id]}
            <DesignNotes
              who="Everyone who works landlord leads: negotiators, managers and owners. The same data feeds every option, so you are comparing layout, not content."
              why="Today's Overview only counts things. This version puts the work itself on the page, so it can be finished from here."
              actions={[
                "Tick an action done, then choose the next step in the same place",
                "Snooze or hand over from the row menu, with Undo",
                "Call or email straight from the row",
                "Record an appraisal outcome in a side panel",
                "Give a lead without a next action one in a single tap",
              ]}
              needs={[
                "Landlord leads, next actions and appraisals (built)",
                "Viewings and a calendar to merge into the schedule (Phase 2)",
                "Real call and email links from contact details (built, to wire)",
              ]}
            />
          </div>
        ) : variant === "pipeline" ? (
          <LeadPipeline />
        ) : (
          <TenancyProgression />
        )}
      </div>

      <OutcomeSheet
        open={state.outcomeFor !== null}
        onClose={() => state.setOutcomeFor(null)}
        onSave={state.saveOutcome}
      />
      {state.toastNode}
    </main>
  );
}

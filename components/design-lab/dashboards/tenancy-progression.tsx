"use client";

import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Send,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AvailabilityBadge,
  DesignNotes,
  FilterChips,
  KpiTile,
  useUndoToast,
} from "./shared";
import { cn } from "cn";

/* Step names are generic placeholders. The real referencing, payment and
   agreement steps will be specified separately, not invented here. */
const STEPS = [
  "Offer accepted",
  "Application",
  "Checks",
  "Agreement",
  "Payments",
  "Move-in",
] as const;

type StepState = "done" | "active" | "blocked" | "todo";
type Item = {
  id: string;
  text: string;
  action: string;
  sent: string | null;
};
type Deal = {
  id: string;
  property: string;
  tenant: string;
  landlord: string;
  moveIn: string;
  daysToMoveIn: number;
  steps: StepState[];
  items: Item[];
};

const START: Deal[] = [
  {
    id: "d1",
    property: "3 Park View, M14 5DR",
    tenant: "A. Mensah and J. Mensah",
    landlord: "Grace Okafor",
    moveIn: "Mon 2 Nov",
    daysToMoveIn: 17,
    steps: ["done", "done", "blocked", "todo", "todo", "todo"],
    items: [
      {
        id: "i1",
        text: "Checks for J. Mensah still outstanding for 3 days",
        action: "Send reminder",
        sent: null,
      },
      {
        id: "i2",
        text: "Guarantor details not yet received",
        action: "Request details",
        sent: null,
      },
    ],
  },
  {
    id: "d2",
    property: "61 Canal Street, M1 3HE",
    tenant: "R. Whitfield",
    landlord: "Ingrid Larsen",
    moveIn: "Fri 30 Oct",
    daysToMoveIn: 14,
    steps: ["done", "done", "done", "blocked", "todo", "todo"],
    items: [
      {
        id: "i3",
        text: "Landlord has not signed the agreement (sent 2 days ago)",
        action: "Resend signing link",
        sent: null,
      },
    ],
  },
  {
    id: "d3",
    property: "12 Hall Gardens, M16 7UP",
    tenant: "S. Kaur and family",
    landlord: "Priyanka Rao",
    moveIn: "Mon 16 Nov",
    daysToMoveIn: 31,
    steps: ["done", "active", "todo", "todo", "todo", "todo"],
    items: [
      {
        id: "i4",
        text: "Application form sent, waiting for the tenant",
        action: "Send reminder",
        sent: null,
      },
    ],
  },
  {
    id: "d4",
    property: "28 Orchard Way, M19 2LF",
    tenant: "T. Brennan",
    landlord: "Tom Ellery",
    moveIn: "Fri 23 Oct",
    daysToMoveIn: 7,
    steps: ["done", "done", "done", "done", "active", "todo"],
    items: [
      {
        id: "i5",
        text: "Move-in payment due in 2 days",
        action: "Send payment reminder",
        sent: null,
      },
      {
        id: "i6",
        text: "Key collection not yet booked",
        action: "Offer key times",
        sent: null,
      },
    ],
  },
];

const TONE: Record<StepState, "success" | "primary" | "destructive" | "muted"> =
  {
    done: "success",
    active: "primary",
    blocked: "destructive",
    todo: "muted",
  };

const TONE_CLASS = {
  success: "bg-success",
  primary: "bg-primary",
  destructive: "bg-destructive",
  muted: "bg-muted",
};

function currentStep(deal: Deal) {
  const index = deal.steps.findIndex(
    (step) => step === "blocked" || step === "active",
  );
  return index === -1 ? STEPS.length - 1 : index;
}

export function TenancyProgression() {
  const [deals, setDeals] = useState(START);
  const [filter, setFilter] = useState<"all" | "blocked" | "soon">("all");
  const [expanded, setExpanded] = useState<string | null>("d1");
  const toast = useUndoToast();

  const blocked = deals.filter((deal) => deal.steps.includes("blocked"));
  const soon = deals.filter((deal) => deal.daysToMoveIn <= 14);
  const shown =
    filter === "blocked" ? blocked : filter === "soon" ? soon : deals;
  const sorted = [...shown].sort(
    (a, b) =>
      Number(b.steps.includes("blocked")) -
        Number(a.steps.includes("blocked")) || a.daysToMoveIn - b.daysToMoveIn,
  );

  function send(dealId: string, itemId: string, message: string) {
    setDeals((current) =>
      current.map((deal) =>
        deal.id === dealId
          ? {
              ...deal,
              items: deal.items.map((item) =>
                item.id === itemId ? { ...item, sent: "Sent just now" } : item,
              ),
            }
          : deal,
      ),
    );
    toast.show(message, () =>
      setDeals((current) =>
        current.map((deal) =>
          deal.id === dealId
            ? {
                ...deal,
                items: deal.items.map((item) =>
                  item.id === itemId ? { ...item, sent: null } : item,
                ),
              }
            : deal,
        ),
      ),
    );
  }

  function chaseAll() {
    const previous = deals;
    setDeals((current) =>
      current.map((deal) =>
        deal.steps.includes("blocked")
          ? {
              ...deal,
              items: deal.items.map((item) => ({
                ...item,
                sent: item.sent ?? "Sent just now",
              })),
            }
          : deal,
      ),
    );
    toast.show(
      `Chased ${blocked.length} blocked move${blocked.length === 1 ? "" : "s"}`,
      () => setDeals(previous),
    );
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Lettings progression</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Getting tenants moved in
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Blocked moves first, then by move-in date. Clear the blocker from
            here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AvailabilityBadge value="phase3" />
          <Button onClick={chaseAll} disabled={blocked.length === 0}>
            <Send aria-hidden="true" />
            Chase all blocked ({blocked.length})
          </Button>
        </div>
      </header>

      <p className="rounded-xl bg-info-soft px-4 py-3 text-sm text-info">
        Illustrative only. Step names here are placeholders. The real
        referencing, agreement and payment steps will be specified separately
        before this is built.
      </p>

      <section
        aria-label="Summary"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <KpiTile label="Moves in progress" value={String(deals.length)} />
        <KpiTile
          label="Blocked"
          value={String(blocked.length)}
          tone={blocked.length ? "destructive" : "default"}
          onClick={() => setFilter("blocked")}
          active={filter === "blocked"}
        />
        <KpiTile
          label="Moving in within 14 days"
          value={String(soon.length)}
          tone="warning"
          onClick={() => setFilter("soon")}
          active={filter === "soon"}
        />
        <KpiTile label="Moved in this month" value="5" tone="success" />
      </section>

      <FilterChips
        label="Show"
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "All moves", count: deals.length },
          { id: "blocked", label: "Blocked", count: blocked.length },
          { id: "soon", label: "Moving in soon", count: soon.length },
        ]}
      />

      <ul className="grid gap-3">
        {sorted.map((deal) => {
          const step = currentStep(deal);
          const isBlocked = deal.steps.includes("blocked");
          const open = expanded === deal.id;
          return (
            <li
              key={deal.id}
              className="rounded-xl bg-card shadow-xs ring-1 ring-foreground/10"
            >
              <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {deal.property}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {deal.tenant} · Landlord {deal.landlord}
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <ol
                    className="flex gap-0.5"
                    aria-label={`Progress: ${STEPS[step]}${isBlocked ? " (blocked)" : ""}`}
                  >
                    {deal.steps.map((state, index) => (
                      <li
                        key={STEPS[index]}
                        className={cn(
                          "h-2 min-w-0 flex-1 rounded-[2px]",
                          TONE_CLASS[TONE[state]],
                        )}
                      />
                    ))}
                  </ol>
                  <p
                    className={cn(
                      "flex items-center gap-1.5 text-xs",
                      isBlocked
                        ? "font-medium text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {isBlocked && (
                      <AlertTriangle aria-hidden="true" className="size-3.5" />
                    )}
                    {isBlocked ? "Blocked at" : "Now at"}: {STEPS[step]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={deal.daysToMoveIn <= 14 ? "warning" : "secondary"}
                  >
                    <CalendarCheck
                      aria-hidden="true"
                      data-icon="inline-start"
                    />
                    {deal.moveIn} · {deal.daysToMoveIn}d
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-expanded={open}
                    aria-label={`${open ? "Hide" : "Show"} actions for ${deal.property}`}
                    onClick={() => setExpanded(open ? null : deal.id)}
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </Button>
                </div>
              </div>
              {open && (
                <ul className="divide-y border-t px-4">
                  {deal.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center"
                    >
                      <p className="min-w-0 flex-1 text-sm">{item.text}</p>
                      {item.sent ? (
                        <Badge variant="success">
                          <CheckCircle2
                            aria-hidden="true"
                            data-icon="inline-start"
                          />
                          {item.sent}
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            send(
                              deal.id,
                              item.id,
                              `${item.action}: ${deal.property}`,
                            )
                          }
                        >
                          <Send aria-hidden="true" />
                          {item.action}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
        {sorted.length === 0 && (
          <li className="rounded-xl bg-success-soft p-6 text-center text-sm text-success">
            Nothing matches. Every move is on track.
          </li>
        )}
      </ul>
      {toast.node}

      <DesignNotes
        who="Lettings coordinators or progressors, the people responsible for getting an accepted offer to a move-in without it stalling."
        why="Progression fails quietly when someone is waiting on someone else. The page ranks moves by what is blocked and what is closest to move-in, and puts the chase action next to the blocker."
        actions={[
          "Chase one blocker, or every blocked move at once",
          "See exactly which step is stuck and for how long",
          "Every message is recorded on the move and can be undone before it sends",
          "Filter to blocked or moving-in-soon from the summary tiles",
        ]}
        needs={[
          "Offers, applications and tenancies (Phase 2 to 3)",
          "Approved messaging with delivery history (SHARED-02)",
          "Documents and signatures (SHARED-03)",
          "Referencing, payment and agreement rules, specified separately",
        ]}
      />
    </div>
  );
}

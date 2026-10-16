"use client";

import { Check, MoreHorizontal, Undo2, X, type LucideIcon } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "cn";

/* Sample data only: every name, address and figure is fictional.
   "Today" is fixed so the mock-ups read the same whenever they are opened. */
export const TODAY_LABEL = "Friday 16 October 2026";

export type Person = { id: string; name: string; initials: string };

export const STAFF: Person[] = [
  { id: "olivia", name: "Olivia Hart", initials: "OH" },
  { id: "priya", name: "Priya Nair", initials: "PN" },
  { id: "ruby", name: "Ruby Clarke", initials: "RC" },
  { id: "amelia", name: "Amelia Shaw", initials: "AS" },
];

export function personById(id: string) {
  return STAFF.find((person) => person.id === id) ?? STAFF[0];
}

export function Avatar({
  person,
  className,
}: {
  person: Person;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      title={person.name}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[0.65rem] font-semibold text-accent-foreground",
        className,
      )}
    >
      {person.initials}
    </span>
  );
}

export type Availability = "now" | "phase2" | "phase3" | "phase4" | "reporting";

const AVAILABILITY: Record<
  Availability,
  { label: string; variant: "success" | "info" | "secondary" }
> = {
  now: { label: "Data exists today", variant: "success" },
  reporting: { label: "Needs reporting (SHARED-05)", variant: "info" },
  phase2: { label: "Roadmap Phase 2", variant: "secondary" },
  phase3: { label: "Roadmap Phase 3", variant: "secondary" },
  phase4: { label: "Roadmap Phase 4", variant: "secondary" },
};

export function AvailabilityBadge({ value }: { value: Availability }) {
  const { label, variant } = AVAILABILITY[value];
  return <Badge variant={variant}>{label}</Badge>;
}

/**
 * A bar made of equal blocks. It needs no inline styles (which the Content
 * Security Policy blocks) and reads clearly in both themes.
 */
export function Segments({
  filled,
  total = 12,
  tone = "primary",
  label,
}: {
  filled: number;
  total?: number;
  tone?: "primary" | "success" | "warning" | "destructive";
  label: string;
}) {
  const fillClass = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
  }[tone];
  return (
    <span role="img" aria-label={label} className="flex w-full min-w-0 gap-0.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-2 min-w-0 flex-1 rounded-[2px]",
            index < filled ? fillClass : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

export function KpiTile({
  label,
  value,
  note,
  tone = "default",
  onClick,
  active,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "default" | "warning" | "destructive" | "success";
  onClick?: () => void;
  active?: boolean;
}) {
  const valueTone = {
    default: "text-foreground",
    warning: "text-warning",
    destructive: "text-destructive",
    success: "text-success",
  }[tone];
  const body = (
    <>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-2xl font-semibold tabular-nums", valueTone)}>
        {value}
      </span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </>
  );
  const shared =
    "flex min-w-0 flex-col gap-1 rounded-xl bg-card p-4 text-left shadow-xs ring-1 ring-foreground/10";
  if (!onClick) return <div className={shared}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        shared,
        "cursor-pointer transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active && "ring-2 ring-primary",
      )}
    >
      {body}
    </button>
  );
}

export function SectionHeading({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count?: number;
  tone?: "destructive" | "warning";
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border-b pb-2">
      <h2
        className={cn(
          "text-sm font-semibold",
          tone === "destructive" && "text-destructive",
          tone === "warning" && "text-warning",
        )}
      >
        {title}
      </h2>
      {count !== undefined && (
        <Badge variant="secondary" className="tabular-nums">
          {count}
        </Badge>
      )}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}

/** Pick-one chips: the same control everywhere a dashboard needs a filter. */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string; count?: number }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center gap-1.5"
    >
      {options.map((option) => (
        <Button
          key={option.id}
          size="sm"
          variant={value === option.id ? "default" : "outline"}
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
          {option.count !== undefined && (
            <span className="tabular-nums opacity-70">{option.count}</span>
          )}
        </Button>
      ))}
    </div>
  );
}

/**
 * Every action on these dashboards confirms itself and can be undone, so
 * working fast never means working scared.
 */
export function useUndoToast() {
  const [toast, setToast] = useState<{
    message: string;
    undo?: () => void;
  } | null>(null);
  const show = useCallback((message: string, undo?: () => void) => {
    setToast({ message, undo });
  }, []);
  const node = toast ? (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-xl sm:left-auto sm:right-6 sm:mx-0"
    >
      <Check aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{toast.message}</span>
      {toast.undo && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            toast.undo?.();
            setToast(null);
          }}
        >
          <Undo2 aria-hidden="true" />
          Undo
        </Button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        className="rounded-md p-1 opacity-70 hover:opacity-100"
        onClick={() => setToast(null)}
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  ) : null;
  return { show, node };
}

/** The "design notes" band under each concept. */
export function DesignNotes({
  who,
  why,
  actions,
  needs,
}: {
  who: string;
  why: string;
  actions: readonly string[];
  needs: readonly string[];
}) {
  return (
    <aside
      aria-label="Design notes"
      className="mt-8 grid gap-6 border-t pt-6 text-sm md:grid-cols-2 xl:grid-cols-4"
    >
      <div className="grid content-start gap-1">
        <h3 className="font-semibold">Who it is for</h3>
        <p className="text-muted-foreground">{who}</p>
      </div>
      <div className="grid content-start gap-1">
        <h3 className="font-semibold">Why this shape</h3>
        <p className="text-muted-foreground">{why}</p>
      </div>
      <div className="grid content-start gap-1">
        <h3 className="font-semibold">Actions without leaving the page</h3>
        <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
          {actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </div>
      <div className="grid content-start gap-1">
        <h3 className="font-semibold">What must exist first</h3>
        <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
          {needs.map((need) => (
            <li key={need}>{need}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export type MenuItem = {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
};

/**
 * The single "more" menu on a row. One primary action stays visible next to
 * it; everything else lives here so rows stay calm.
 */
export function ActionMenu({
  label,
  items,
  text,
  icon: TriggerIcon,
}: {
  label: string;
  items: readonly MenuItem[];
  /** Show a labelled button instead of the bare "more" dots. */
  text?: string;
  icon?: LucideIcon;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          text ? (
            <Button variant="outline" size="sm" aria-label={label} />
          ) : (
            <Button variant="ghost" size="icon-sm" aria-label={label} />
          )
        }
      >
        {text ? (
          <>
            {TriggerIcon && <TriggerIcon aria-hidden="true" />}
            {text}
          </>
        ) : (
          <MoreHorizontal aria-hidden="true" />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 gap-0.5 p-1.5">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              setOpen(false);
              item.onSelect();
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
              item.destructive && "text-destructive",
            )}
          >
            {item.icon && <item.icon aria-hidden="true" className="size-4" />}
            {item.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

"use client";

import {
  Archive,
  Ban,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  GitBranch,
  Hash,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  ReceiptText,
  Star,
  UserPlus,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

/* Sample data only: every value is fictional. */
const CONTACT = {
  name: "Hawthorne Property Holdings Ltd",
  trading: "Hawthorne Property",
  reference: "ORG-JR5SX4JF",
  type: "Limited company",
  registration: "00000001",
  vat: "Not recorded",
  branch: "Main Branch",
  email: {
    value: "accounts@hawthorne-property.example.test",
    label: "Accounts",
  },
  phone: { value: "020 7946 0321", label: "Work" },
  address: "32 Market Square, Demo Town, London, ZZ15CC",
  preferred: "Email",
  doNotUse: "None",
};

const PEOPLE = [
  {
    name: "Mr Daniel Foster",
    role: "Director",
    main: true,
    email: "daniel.foster@example.test",
  },
  {
    name: "Ms Eleanor Price",
    role: "Property contact",
    main: false,
    email: "eleanor.price@example.test",
  },
];

const NOTES = [
  {
    author: "Olivia Hart",
    when: "14 Oct 2026, 10:30",
    branch: "Main Branch",
    edited: false,
    body: "Called about the Riverside Mews portfolio. Wants a valuation for two flats next week and prefers email for the paperwork.",
  },
  {
    author: "Sam Carter",
    when: "9 Oct 2026, 15:05",
    branch: "All branches",
    edited: true,
    body: "Accounts team confirmed the registered address is the correct correspondence address.",
  },
  {
    author: "Olivia Hart",
    when: "2 Oct 2026, 09:12",
    branch: "Main Branch",
    edited: false,
    body: "Introduced by the Demo Town landlords association. Director is Daniel Foster.",
  },
];

const VARIANTS = [
  { id: "current", label: "Current" },
  { id: "sidebar", label: "1 · Profile sidebar" },
  { id: "sheet", label: "2 · Single sheet" },
  { id: "tabs", label: "3 · Summary and tabs" },
  { id: "workspace", label: "4 · Notes-first" },
  { id: "sections", label: "5 · Collapsible sections" },
] as const;

type VariantId = (typeof VARIANTS)[number]["id"];

function initials(name: string) {
  return name
    .replace(/^(Mr|Ms|Mrs|Dr)\s/, "")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-primary ${
        size === "lg" ? "size-14 text-lg" : "size-9 text-sm"
      }`}
    >
      {initials(name)}
    </span>
  );
}

function Pair({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  icon?: typeof Mail;
}) {
  return (
    <div className="flex gap-3">
      {Icon && (
        <Icon
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      )}
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium [overflow-wrap:anywhere]">
          {value}
        </dd>
      </div>
    </div>
  );
}

function Actions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button>
        <Pencil aria-hidden="true" />
        Edit contact
      </Button>
      <Button variant="ghost">
        <Archive aria-hidden="true" />
        Archive
      </Button>
    </div>
  );
}

function TitleBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h1
          className={`font-semibold tracking-tight ${compact ? "text-xl" : "text-2xl"}`}
        >
          {CONTACT.name}
        </h1>
        <Badge variant="secondary">Organisation</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{CONTACT.reference}</p>
    </div>
  );
}

function NoteList() {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] divide-y">
      {NOTES.map((note) => (
        <li key={note.body} className="grid gap-1.5 py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{note.author}</span>
            <span>{note.when}</span>
            <span className="inline-flex items-center gap-1">
              <GitBranch className="size-3" aria-hidden="true" />
              {note.branch}
            </span>
            {note.edited && <Badge variant="secondary">Edited</Badge>}
          </div>
          <p className="text-sm">{note.body}</p>
        </li>
      ))}
    </ul>
  );
}

function NoteComposer() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <Textarea
        aria-label="New note"
        placeholder="What was discussed or agreed?"
        className="min-h-20"
      />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="button">Add note</Button>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" />
          Share with all branches
        </label>
      </div>
    </div>
  );
}

function PeopleList({ divided = true }: { divided?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <ul
        className={`grid grid-cols-[minmax(0,1fr)] ${divided ? "divide-y" : "gap-3"}`}
      >
        {PEOPLE.map((person) => (
          <li
            key={person.name}
            className={`flex items-center gap-3 ${divided ? "py-3 first:pt-0 last:pb-0" : ""}`}
          >
            <Avatar name={person.name} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{person.name}</span>
                {person.main && (
                  <Badge variant="secondary">
                    <Star aria-hidden="true" />
                    Main contact
                  </Badge>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {person.role} · {person.email}
              </p>
            </div>
            <Button variant="ghost" size="sm">
              Manage
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" className="w-fit">
        <UserPlus aria-hidden="true" />
        Link person
      </Button>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function DetailsGrid({ columns = 2 }: { columns?: 2 | 3 }) {
  return (
    <dl
      className={`grid gap-x-8 gap-y-5 ${columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}
    >
      <Pair label="Email" value={CONTACT.email.value} icon={Mail} />
      <Pair label="Telephone" value={CONTACT.phone.value} icon={Phone} />
      <Pair label="Registered address" value={CONTACT.address} icon={MapPin} />
      <Pair label="Trading name" value={CONTACT.trading} icon={Building2} />
      <Pair
        label="Organisation type"
        value={CONTACT.type}
        icon={BriefcaseBusiness}
      />
      <Pair
        label="Registration number"
        value={CONTACT.registration}
        icon={Hash}
      />
      <Pair label="VAT number" value={CONTACT.vat} icon={ReceiptText} />
      <Pair
        label="Preferred contact"
        value={CONTACT.preferred}
        icon={MessageCircle}
      />
      <Pair label="Do not use" value={CONTACT.doNotUse} icon={Ban} />
      <Pair
        label="Responsible branch"
        value={CONTACT.branch}
        icon={GitBranch}
      />
    </dl>
  );
}

/* ---------- Current layout, for comparison ---------- */
function CurrentLayout() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <TitleBlock />
        <Actions />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact methods</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Pair
              label={CONTACT.email.label}
              value={CONTACT.email.value}
              icon={Mail}
            />
            <Pair
              label={CONTACT.phone.label}
              value={CONTACT.phone.value}
              icon={Phone}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Address details</CardTitle>
          </CardHeader>
          <CardContent>
            <Pair label="Registered" value={CONTACT.address} icon={MapPin} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Organisation details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Pair
              label="Trading name"
              value={CONTACT.trading}
              icon={Building2}
            />
            <Pair
              label="Organisation type"
              value={CONTACT.type}
              icon={BriefcaseBusiness}
            />
            <Pair
              label="Registration number"
              value={CONTACT.registration}
              icon={Hash}
            />
            <Pair label="VAT number" value={CONTACT.vat} icon={ReceiptText} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>People</CardTitle>
          </CardHeader>
          <CardContent>
            <PeopleList divided={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Preferences and branch</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Pair
              label="Preferred contact"
              value={CONTACT.preferred}
              icon={MessageCircle}
            />
            <Pair
              label="Responsible branch"
              value={CONTACT.branch}
              icon={GitBranch}
            />
            <Pair label="Do not use" value={CONTACT.doNotUse} icon={Ban} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <NoteComposer />
            <NoteList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------- 1. Profile sidebar ---------- */
function SidebarLayout() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="grid min-w-0 content-start gap-6 lg:border-r lg:pr-8">
        <div className="flex items-center gap-4 lg:flex-col lg:items-start">
          <Avatar name="Hawthorne Property" size="lg" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {CONTACT.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Organisation</Badge>
              <span className="text-xs text-muted-foreground">
                {CONTACT.reference}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm">
            <Pencil aria-hidden="true" />
            Edit
          </Button>
          <Button size="sm" variant="ghost">
            <Archive aria-hidden="true" />
            Archive
          </Button>
        </div>
        <dl className="grid gap-5 border-t pt-6">
          <Pair label="Email" value={CONTACT.email.value} icon={Mail} />
          <Pair label="Telephone" value={CONTACT.phone.value} icon={Phone} />
          <Pair label="Address" value={CONTACT.address} icon={MapPin} />
          <Pair label="Branch" value={CONTACT.branch} icon={GitBranch} />
        </dl>
        <dl className="grid gap-5 border-t pt-6">
          <Pair label="Trading name" value={CONTACT.trading} />
          <Pair label="Type" value={CONTACT.type} />
          <Pair label="Registration number" value={CONTACT.registration} />
          <Pair label="VAT number" value={CONTACT.vat} />
          <Pair label="Preferred contact" value={CONTACT.preferred} />
          <Pair label="Do not use" value={CONTACT.doNotUse} />
        </dl>
      </aside>
      <div className="grid min-w-0 content-start gap-10">
        <Section title="People">
          <PeopleList />
        </Section>
        <Section title="Notes">
          <NoteComposer />
          <div className="border-t pt-4">
            <NoteList />
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ---------- 2. Single sheet ---------- */
function SheetLayout() {
  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <TitleBlock />
        <Actions />
      </div>
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10">
        <Section title="Details">
          <DetailsGrid />
        </Section>
        <hr />
        <Section title="People">
          <PeopleList />
        </Section>
        <hr />
        <Section title="Notes">
          <NoteComposer />
          <div className="border-t pt-4">
            <NoteList />
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ---------- 3. Summary band and tabs ---------- */
function TabsLayout() {
  const [tab, setTab] = useState<"overview" | "people" | "notes">("overview");
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "people", label: `People (${PEOPLE.length})` },
    { id: "notes", label: `Notes (${NOTES.length})` },
  ] as const;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="rounded-2xl bg-muted/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name="Hawthorne Property" size="lg" />
            <TitleBlock />
          </div>
          <Actions />
        </div>
        <dl className="mt-6 grid gap-5 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Pair label="Email" value={CONTACT.email.value} icon={Mail} />
          <Pair label="Telephone" value={CONTACT.phone.value} icon={Phone} />
          <Pair label="Main contact" value="Mr Daniel Foster" icon={Star} />
          <Pair label="Branch" value={CONTACT.branch} icon={GitBranch} />
        </dl>
      </div>
      <div role="tablist" className="flex gap-6 border-b">
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
              tab === item.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "overview" && <DetailsGrid columns={3} />}
      {tab === "people" && <PeopleList />}
      {tab === "notes" && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
          <NoteComposer />
          <div className="border-t pt-4">
            <NoteList />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 4. Notes-first workspace ---------- */
function WorkspaceLayout() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name="Hawthorne Property" size="lg" />
          <TitleBlock />
        </div>
        <Actions />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 content-start gap-6">
          <NoteComposer />
          <div className="border-t pt-4">
            <NoteList />
          </div>
        </div>
        <aside className="grid min-w-0 content-start gap-6 rounded-2xl bg-muted/50 p-5">
          <section className="grid gap-3">
            <h2 className="text-sm font-semibold">At a glance</h2>
            <dl className="grid gap-4">
              <Pair label="Email" value={CONTACT.email.value} icon={Mail} />
              <Pair
                label="Telephone"
                value={CONTACT.phone.value}
                icon={Phone}
              />
              <Pair label="Address" value={CONTACT.address} icon={MapPin} />
              <Pair label="Branch" value={CONTACT.branch} icon={GitBranch} />
              <Pair
                label="Preferred contact"
                value={CONTACT.preferred}
                icon={MessageCircle}
              />
            </dl>
          </section>
          <section className="grid gap-3 border-t pt-5">
            <h2 className="text-sm font-semibold">People</h2>
            <PeopleList />
          </section>
          <section className="grid gap-3 border-t pt-5">
            <h2 className="text-sm font-semibold">Company details</h2>
            <dl className="grid gap-4">
              <Pair label="Type" value={CONTACT.type} />
              <Pair label="Registration number" value={CONTACT.registration} />
              <Pair label="VAT number" value={CONTACT.vat} />
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ---------- 5. Collapsible sections ---------- */
function Collapsible({
  title,
  summary,
  open = false,
  children,
}: {
  title: string;
  summary?: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={open} className="group border-b py-1">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-base font-semibold">{title}</span>
          {summary && (
            <span className="text-sm text-muted-foreground">{summary}</span>
          )}
        </span>
        <ChevronDown
          className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="pb-6">{children}</div>
    </details>
  );
}

function SectionsLayout() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <TitleBlock />
        <Actions />
      </div>
      <div className="border-t">
        <Collapsible
          title="Contact details"
          summary={`${CONTACT.email.value} · ${CONTACT.phone.value}`}
          open
        >
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Pair label="Email" value={CONTACT.email.value} icon={Mail} />
            <Pair label="Telephone" value={CONTACT.phone.value} icon={Phone} />
            <Pair
              label="Registered address"
              value={CONTACT.address}
              icon={MapPin}
            />
            <Pair
              label="Preferred contact"
              value={CONTACT.preferred}
              icon={MessageCircle}
            />
          </dl>
        </Collapsible>
        <Collapsible title="Company details" summary={CONTACT.type}>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Pair
              label="Trading name"
              value={CONTACT.trading}
              icon={Building2}
            />
            <Pair
              label="Registration number"
              value={CONTACT.registration}
              icon={Hash}
            />
            <Pair label="VAT number" value={CONTACT.vat} icon={ReceiptText} />
            <Pair
              label="Responsible branch"
              value={CONTACT.branch}
              icon={GitBranch}
            />
          </dl>
        </Collapsible>
        <Collapsible title="People" summary={`${PEOPLE.length} linked`} open>
          <PeopleList />
        </Collapsible>
        <Collapsible title="Notes" summary={`${NOTES.length} notes`} open>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            <NoteComposer />
            <div className="border-t pt-4">
              <NoteList />
            </div>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}

const LAYOUTS: Record<VariantId, () => ReactNode> = {
  current: () => <CurrentLayout />,
  sidebar: () => <SidebarLayout />,
  sheet: () => <SheetLayout />,
  tabs: () => <TabsLayout />,
  workspace: () => <WorkspaceLayout />,
  sections: () => <SectionsLayout />,
};

const DESCRIPTIONS: Record<VariantId, string> = {
  current: "Today's layout: every group of details sits in its own card.",
  sidebar:
    "Identity and key details live in a slim left column; People and Notes get the wide working area. No cards, just dividers.",
  sheet:
    "The whole record is one clean sheet, separated only by headings and hairlines. Closest to a printed record.",
  tabs: "A summary band shows what matters at a glance; Overview, People and Notes are separate tabs so only one area shows at a time.",
  workspace:
    "Notes are the main working area (most daily use), with a quiet side panel for details and people.",
  sections:
    "Everything is a collapsible section with a one-line summary. Compact, and you open only what you need.",
};

export function ContactPageLab() {
  const [variant, setVariant] = useState<VariantId>("sidebar");
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <p className="text-sm font-semibold">Contact page options</p>
            <p className="text-xs text-muted-foreground">
              Mock-ups with sample data. Try light and dark, and a narrow window
              for mobile.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <nav
          aria-label="Layout options"
          className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3"
        >
          {VARIANTS.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={variant === item.id ? "default" : "outline"}
              onClick={() => setVariant(item.id)}
              className="shrink-0"
            >
              {item.label}
            </Button>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <p className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
          {variant === "sidebar" && (
            <Badge variant="default">Selected direction (ADR-030)</Badge>
          )}
          {DESCRIPTIONS[variant]}
        </p>
        {LAYOUTS[variant]()}
      </div>
    </main>
  );
}

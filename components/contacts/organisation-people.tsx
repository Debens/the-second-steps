"use client";

import { LoaderCircle, Search, Star, UserPlus } from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import type { PersonLinkFormState } from "@/app/dashboard/w/[workspaceSlug]/contacts/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type LinkAction = (
  state: PersonLinkFormState,
  data: FormData,
) => Promise<PersonLinkFormState>;
type EndAction = (state: PersonLinkFormState) => Promise<PersonLinkFormState>;

export type LinkedPerson = {
  linkId: string;
  personId: string;
  name: string;
  reference: string;
  relationshipLabel: string;
  isPrimary: boolean;
  preferredContact: string | null;
  updateAction: LinkAction;
  endAction: EndAction;
};

type PersonResult = { id: string; label: string; reference: string };

const IDLE: PersonLinkFormState = { status: "idle", message: "" };

function FormMessage({ state }: { state: PersonLinkFormState }) {
  if (state.status !== "error") return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {state.message}
    </p>
  );
}

function RelationshipFields({
  idPrefix,
  label = "",
  isPrimary = false,
}: {
  idPrefix: string;
  label?: string;
  isPrimary?: boolean;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-relationship`}>
          Relationship (optional)
        </Label>
        <Input
          id={`${idPrefix}-relationship`}
          name="relationshipLabel"
          defaultValue={label}
          maxLength={100}
          placeholder="For example Director or Property contact"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPrimary" defaultChecked={isPrimary} />
        Main contact for this organisation
      </label>
    </>
  );
}

function useCloseOnSave(
  state: PersonLinkFormState,
  setOpen: (open: boolean) => void,
) {
  useEffect(() => {
    if (state.status === "saved") setOpen(false);
  }, [state, setOpen]);
}

function LinkPersonForm({
  action,
  excludeIds,
  onSaved,
  search,
}: {
  action: LinkAction;
  excludeIds: ReadonlySet<string>;
  onSaved: (open: boolean) => void;
  search: (query: string) => Promise<PersonResult[]>;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonResult[] | null>(null);
  const [searching, startSearch] = useTransition();
  useCloseOnSave(state, onSaved);

  function runSearch(event?: FormEvent) {
    event?.preventDefault();
    startSearch(async () => setResults(await search(query)));
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="link-person-search">Find a person</Label>
        <div className="flex gap-2">
          <Input
            id="link-person-search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") runSearch(event);
            }}
            placeholder="Name, reference, email or telephone"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => runSearch()}
            disabled={searching}
          >
            {searching ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Search aria-hidden="true" />
            )}
            Search
          </Button>
        </div>
      </div>
      <form action={formAction} className="grid gap-4">
        {results && (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Results</legend>
            {results.filter(({ id }) => !excludeIds.has(id)).length ? (
              <div className="grid max-h-60 gap-1 overflow-y-auto rounded-xl border p-1">
                {results
                  .filter(({ id }) => !excludeIds.has(id))
                  .map((person) => (
                    <label
                      key={person.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted has-checked:bg-accent"
                    >
                      <input
                        type="radio"
                        name="personContactId"
                        value={person.id}
                        required
                      />
                      <span className="font-medium">{person.label}</span>
                      <span className="text-muted-foreground">
                        {person.reference}
                      </span>
                    </label>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No unlinked people found. Choose New person to add them.
              </p>
            )}
          </fieldset>
        )}
        <RelationshipFields idPrefix="new-link" />
        <FormMessage state={state} />
        <DialogFooter>
          <Button type="submit" disabled={pending || !results?.length}>
            {pending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Link person
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}

function NewPersonForm({
  createAction,
  linkAction,
  onSaved,
}: {
  createAction: LinkAction;
  linkAction: LinkAction;
  onSaved: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(createAction, IDLE);
  const [linkState, linkFormAction, linking] = useActionState(linkAction, IDLE);
  useCloseOnSave(state, onSaved);
  useCloseOnSave(linkState, onSaved);
  const [, startSubmit] = useTransition();
  const errors = state.fieldErrors ?? {};

  // Submit manually so React does not reset the typed details when the
  // duplicate warning or a validation message comes back.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startSubmit(() =>
      submitter?.dataset.linkExisting ? linkFormAction(data) : formAction(data),
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="new-person-first-name">First name</Label>
          <Input
            id="new-person-first-name"
            name="firstName"
            required
            autoComplete="off"
            aria-invalid={Boolean(errors.firstName)}
          />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-person-last-name">Surname</Label>
          <Input
            id="new-person-last-name"
            name="lastName"
            required
            autoComplete="off"
            aria-invalid={Boolean(errors.lastName)}
          />
          {errors.lastName && (
            <p className="text-xs text-destructive">{errors.lastName}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-person-email">Email</Label>
          <Input
            id="new-person-email"
            name="email"
            type="email"
            autoComplete="off"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-person-telephone">Telephone</Label>
          <Input
            id="new-person-telephone"
            name="telephone"
            type="tel"
            autoComplete="off"
          />
        </div>
      </div>
      {errors.contactMethods ? (
        <p className="text-xs text-destructive">{errors.contactMethods}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Add at least an email or telephone. Other details can be added from
          the person&apos;s record later.
        </p>
      )}
      <RelationshipFields idPrefix="new-person" />
      {state.status === "duplicates" && state.duplicates && (
        <div className="grid gap-3 rounded-xl border border-warning/40 bg-warning-soft p-3">
          <p className="text-sm font-medium">{state.message}</p>
          <ul className="grid gap-2">
            {state.duplicates.map((duplicate) => (
              <li
                key={duplicate.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <div className="text-sm">
                  <span className="font-medium">{duplicate.label}</span>{" "}
                  <span className="text-muted-foreground">
                    {duplicate.reference} · matches{" "}
                    {duplicate.matchedFields.join(", ").replaceAll("_", " ")}
                  </span>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  data-link-existing="true"
                  formNoValidate
                  name="personContactId"
                  value={duplicate.id}
                  disabled={linking}
                >
                  Link this person
                </Button>
              </li>
            ))}
          </ul>
          <input
            type="hidden"
            name="duplicateReviewToken"
            value={state.duplicateReviewToken}
          />
        </div>
      )}
      <FormMessage state={state.status === "error" ? state : linkState} />
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          {state.status === "duplicates"
            ? "Create new person anyway"
            : "Add and link person"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function LinkPersonDialog({
  action,
  createAction,
  excludeIds,
  search,
}: {
  action: LinkAction;
  createAction: LinkAction;
  excludeIds: ReadonlySet<string>;
  search: (query: string) => Promise<PersonResult[]>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setMode("existing");
      }}
    >
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="w-fit" />}
      >
        <UserPlus aria-hidden="true" />
        Link person
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link a person</DialogTitle>
          <DialogDescription>
            Linked people become visible to this organisation&apos;s branches
            that you manage.
          </DialogDescription>
        </DialogHeader>
        <ToggleGroup
          aria-label="Person to link"
          value={[mode]}
          onValueChange={(next) => {
            const chosen = next[0];
            if (chosen === "existing" || chosen === "new") setMode(chosen);
          }}
          variant="outline"
          spacing={0}
          className="w-full"
        >
          <ToggleGroupItem
            value="existing"
            className="flex-1 aria-pressed:bg-accent aria-pressed:text-primary"
          >
            Existing person
          </ToggleGroupItem>
          <ToggleGroupItem
            value="new"
            className="flex-1 aria-pressed:bg-accent aria-pressed:text-primary"
          >
            New person
          </ToggleGroupItem>
        </ToggleGroup>
        {open && mode === "existing" && (
          <LinkPersonForm
            action={action}
            excludeIds={excludeIds}
            onSaved={setOpen}
            search={search}
          />
        )}
        {open && mode === "new" && (
          <NewPersonForm
            createAction={createAction}
            linkAction={action}
            onSaved={setOpen}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ManageLinkForm({
  person,
  onSaved,
}: {
  person: LinkedPerson;
  onSaved: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(
    person.updateAction,
    IDLE,
  );
  const [endState, endAction, ending] = useActionState(person.endAction, IDLE);
  const [confirmEnd, setConfirmEnd] = useState(false);
  useCloseOnSave(state, onSaved);
  useCloseOnSave(endState, onSaved);

  return (
    <div className="grid gap-4">
      <form action={formAction} className="grid gap-4">
        <RelationshipFields
          idPrefix={`link-${person.linkId}`}
          label={person.relationshipLabel}
          isPrimary={person.isPrimary}
        />
        <FormMessage state={state} />
        <DialogFooter>
          <Button type="submit" disabled={pending}>
            {pending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Save link
          </Button>
        </DialogFooter>
      </form>
      <div className="grid gap-3 border-t pt-4">
        {confirmEnd ? (
          <form action={endAction} className="grid gap-3">
            <p className="text-sm">
              End this link? It stays in the history but {person.name} will no
              longer be shown as linked.
            </p>
            <FormMessage state={endState} />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="destructive" disabled={ending}>
                End link
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmEnd(false)}
              >
                Keep link
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="w-fit"
            onClick={() => setConfirmEnd(true)}
          >
            End link…
          </Button>
        )}
      </div>
    </div>
  );
}

function ManageLinkDialog({ person }: { person: LinkedPerson }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" />}
        aria-label={`Manage link to ${person.name}`}
      >
        Manage
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{person.name}</DialogTitle>
          <DialogDescription>
            Update how this person relates to the organisation.
          </DialogDescription>
        </DialogHeader>
        {open && <ManageLinkForm person={person} onSaved={setOpen} />}
      </DialogContent>
    </Dialog>
  );
}

export function OrganisationPeople({
  basePath,
  canManage,
  createAction,
  linkAction,
  people,
  search,
}: {
  basePath: string;
  canManage: boolean;
  createAction: LinkAction;
  linkAction: LinkAction;
  people: readonly LinkedPerson[];
  search: (query: string) => Promise<PersonResult[]>;
}) {
  const linkedIds = new Set(people.map(({ personId }) => personId));
  return (
    <div className="grid gap-4">
      {people.length ? (
        <ul className="grid grid-cols-[minmax(0,1fr)] divide-y">
          {people.map((person) => (
            <li
              key={person.linkId}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span
                aria-hidden="true"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary"
              >
                {person.name
                  .replace(/^(Mr|Ms|Mrs|Miss|Mx|Dr)\s/, "")
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`${basePath}/${person.personId}`}
                    className="text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {person.name}
                  </Link>
                  {person.isPrimary && (
                    <Badge variant="secondary">
                      <Star aria-hidden="true" />
                      Main contact
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {[
                    person.relationshipLabel || "Linked person",
                    person.preferredContact,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {canManage && <ManageLinkDialog person={person} />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No people linked yet.</p>
      )}
      {canManage && (
        <LinkPersonDialog
          action={linkAction}
          createAction={createAction}
          excludeIds={linkedIds}
          search={search}
        />
      )}
    </div>
  );
}

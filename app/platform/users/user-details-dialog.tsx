"use client";

import { Check, Copy, Eye, LoaderCircle, Pencil } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
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
import { ROLE_LABELS } from "@/core/access/domain/role";
import type { PlatformUserSummary } from "@/core/platform/application/platform-directory";
import {
  formatPersonName,
  PERSON_NAME_PART_MAX_LENGTH,
} from "@/core/platform/domain/user-profile";
import { StatusPill } from "../status-pill";
import { updateUserNameAction, type UpdateUserProfileState } from "./actions";
import {
  COPY_EMAIL_FEEDBACK_MS,
  copyDisplayedEmail,
  copyEmailFeedback,
  signInEmailCopyValue,
  writeClipboardText,
  type CopyEmailStatus,
} from "./copy-email";

const MEMBERSHIP_STATUS_LABELS = {
  ACTIVE: "Active access",
  SUSPENDED: "Suspended access",
  ENDED: "Access ended",
} as const;

const INITIAL_UPDATE_USER_PROFILE_STATE: UpdateUserProfileState = {
  status: "idle",
  message: "",
};

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function copyButtonClassName(status: CopyEmailStatus) {
  if (status === "copied") {
    return "border-transparent bg-success-soft text-success hover:bg-success-soft hover:text-success";
  }

  if (status === "failed") {
    return "border-transparent bg-destructive-soft text-destructive hover:bg-destructive-soft hover:text-destructive";
  }

  return undefined;
}

function CopyEmailButton({ email }: { email: string }) {
  const [status, setStatus] = useState<CopyEmailStatus>("idle");
  const resetTimer = useRef<number | null>(null);
  const feedback = copyEmailFeedback(status);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  function showFeedback(next: CopyEmailStatus) {
    setStatus(next);
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
    }
    resetTimer.current = window.setTimeout(() => {
      setStatus("idle");
      resetTimer.current = null;
    }, COPY_EMAIL_FEEDBACK_MS);
  }

  async function copyEmail() {
    const copied = await copyDisplayedEmail(email, writeClipboardText);
    showFeedback(copied ? "copied" : "failed");
  }

  const Icon = status === "copied" ? Check : Copy;

  return (
    <span className="relative inline-flex">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className={copyButtonClassName(status)}
        aria-label={feedback.label}
        onClick={() => {
          void copyEmail();
        }}
      >
        <Icon aria-hidden="true" />
      </Button>
      <span className="sr-only" role="status">
        {feedback.announcement}
      </span>
    </span>
  );
}

function NameEditForm({
  user,
  onCancel,
  onSaved,
}: {
  user: PlatformUserSummary;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const updateAction = updateUserNameAction.bind(null, user.id);
  const [state, formAction, pending] = useActionState(
    updateAction,
    INITIAL_UPDATE_USER_PROFILE_STATE,
  );
  const firstNameError = state.fieldErrors?.firstName;
  const lastNameError = state.fieldErrors?.lastName;

  useEffect(() => {
    if (state.status === "success") onSaved(state.message);
  }, [onSaved, state.message, state.status]);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`first-name-${user.id}`}>First name</Label>
          <Input
            id={`first-name-${user.id}`}
            name="firstName"
            defaultValue={user.firstName ?? ""}
            maxLength={PERSON_NAME_PART_MAX_LENGTH}
            autoComplete="given-name"
            aria-invalid={Boolean(firstNameError)}
            aria-describedby={
              firstNameError ? `first-name-error-${user.id}` : undefined
            }
            disabled={pending}
            required
          />
          {firstNameError && (
            <p
              id={`first-name-error-${user.id}`}
              className="text-xs text-destructive"
            >
              {firstNameError}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`last-name-${user.id}`}>Last name</Label>
          <Input
            id={`last-name-${user.id}`}
            name="lastName"
            defaultValue={user.lastName ?? ""}
            maxLength={PERSON_NAME_PART_MAX_LENGTH}
            autoComplete="family-name"
            aria-invalid={Boolean(lastNameError)}
            aria-describedby={
              lastNameError ? `last-name-error-${user.id}` : undefined
            }
            disabled={pending}
            required
          />
          {lastNameError && (
            <p
              id={`last-name-error-${user.id}`}
              className="text-xs text-destructive"
            >
              {lastNameError}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending && (
            <LoaderCircle
              aria-hidden="true"
              data-icon="inline-start"
              className="animate-spin"
            />
          )}
          {pending ? "Saving" : "Save name"}
        </Button>
      </div>
      {state.status === "error" && (
        <p className="text-xs text-destructive" role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}

function NameEditor({ user }: { user: PlatformUserSummary }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const name = formatPersonName(user.firstName, user.lastName);

  if (editing) {
    return (
      <NameEditForm
        user={user}
        onCancel={() => setEditing(false)}
        onSaved={(nextMessage) => {
          setMessage(nextMessage);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4">
        <div className="grid gap-1">
          <p className="text-xs font-medium text-muted-foreground">Name</p>
          <p className="font-medium">{name}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setMessage("");
            setEditing(true);
          }}
        >
          <Pencil aria-hidden="true" data-icon="inline-start" />
          Edit
        </Button>
      </div>
      <p className="text-xs text-success" role="status">
        {message}
      </p>
    </div>
  );
}

export function UserDetailsDialog({
  user,
  createdAtLabel,
}: {
  user: PlatformUserSummary;
  createdAtLabel: string;
}) {
  const displayName = formatPersonName(user.firstName, user.lastName);
  const signInEmail = signInEmailCopyValue(user.primaryEmail);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={`View ${displayName}`}
          />
        }
      >
        <Eye aria-hidden="true" data-icon="inline-start" />
        View
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{displayName}</DialogTitle>
          <DialogDescription>
            Account details and access across Zayto.
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-3" aria-labelledby={`account-${user.id}`}>
          <div>
            <h3 id={`account-${user.id}`} className="font-medium">
              Zayto account
            </h3>
            <p className="text-sm text-muted-foreground">
              The user&apos;s overall account and internal platform role.
            </p>
          </div>
          <NameEditor user={user} />
          <dl className="grid gap-x-6 gap-y-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
            <Detail label="Sign-in email">
              {signInEmail ? (
                <div className="flex items-center gap-2">
                  <span className="min-w-0 break-all">{signInEmail}</span>
                  <CopyEmailButton email={signInEmail} />
                </div>
              ) : (
                (user.primaryEmail ?? "Email not recorded")
              )}
            </Detail>
            <Detail label="Account status">
              <StatusPill
                label={user.status === "ACTIVE" ? "Active" : "Suspended"}
                tone={user.status === "ACTIVE" ? "active" : "suspended"}
              />
            </Detail>
            <Detail label="Zayto role">
              {user.isPlatformOwner ? "Platform Owner" : "No platform role"}
            </Detail>
            <Detail label="User since">{createdAtLabel}</Detail>
          </dl>
        </section>

        <section
          className="grid gap-3"
          aria-labelledby={`memberships-${user.id}`}
        >
          <div>
            <h3 id={`memberships-${user.id}`} className="font-medium">
              Customer access
            </h3>
            <p className="text-sm text-muted-foreground">
              Separate access and roles held for each customer.
            </p>
          </div>

          {user.memberships.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              This user has no customer memberships.
            </p>
          ) : (
            <div className="grid gap-2">
              {user.memberships.map((membership) => (
                <div
                  key={membership.id}
                  className="grid gap-3 rounded-lg border bg-muted/20 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/platform/customers/${membership.customer.slug}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {membership.customer.displayName}
                    </Link>
                    <StatusPill
                      label={MEMBERSHIP_STATUS_LABELS[membership.status]}
                      tone={
                        membership.status === "ACTIVE"
                          ? "active"
                          : membership.status === "SUSPENDED"
                            ? "suspended"
                            : "inactive"
                      }
                    />
                  </div>
                  <Detail label="Customer roles">
                    {membership.roles.length > 0
                      ? membership.roles
                          .map((role) => ROLE_LABELS[role])
                          .join(", ")
                      : "No roles assigned"}
                  </Detail>
                </div>
              ))}
            </div>
          )}
        </section>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

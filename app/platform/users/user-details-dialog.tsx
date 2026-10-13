"use client";

import { Check, Copy, Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import { ROLE_LABELS } from "@/core/access/domain/role";
import type { PlatformUserSummary } from "@/core/platform/application/platform-directory";
import { StatusPill } from "../status-pill";
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

export function UserDetailsDialog({
  user,
  createdAtLabel,
}: {
  user: PlatformUserSummary;
  createdAtLabel: string;
}) {
  const displayName = user.displayName ?? "Unnamed user";
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

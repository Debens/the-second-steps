"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SandboxQuickSignInOption } from "@/core/auth/config";
import { quickSignIn, requestMagicLink } from "./actions";
import { initialLoginState, type LoginState } from "./login-state";

function LoginFeedback({
  invalidLink,
  state,
}: {
  invalidLink: boolean;
  state: LoginState;
}) {
  if (!invalidLink && !state.message) return null;

  const isError = state.status === "error" || invalidLink;
  return (
    <p
      role={isError ? "alert" : "status"}
      className={isError ? "text-sm text-destructive" : "text-sm text-success"}
    >
      {invalidLink
        ? "That sign-in link is invalid or has expired. Try signing in again."
        : state.message}
    </p>
  );
}

function DisabledGoogleButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
      disabled
    >
      Continue with Google (coming next)
    </Button>
  );
}

function QuickSignInForm({
  invalidLink,
  options,
}: {
  invalidLink: boolean;
  options: readonly SandboxQuickSignInOption[];
}) {
  const [state, formAction, pending] = useActionState(
    quickSignIn,
    initialLoginState,
  );

  return (
    <Card className="ring-border">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Sandbox sign-in</CardTitle>
        <CardDescription>
          Choose a fictional user to test their exact Zayto access.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sandbox-user">Sandbox user</Label>
            <Select name="email" defaultValue={options[0]?.email} required>
              <SelectTrigger id="sandbox-user" className="min-h-11 w-full">
                <SelectValue placeholder="Choose a fictional user" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {options.map((option) => (
                  <SelectItem key={option.email} value={option.email}>
                    <span>{option.displayName}</span>
                    <span className="text-muted-foreground">
                      {option.accessLabel} · {option.email}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <LoginFeedback invalidLink={invalidLink} state={state} />
        </CardContent>
        <CardFooter className="mt-4 border-t-0 bg-transparent">
          <div className="grid w-full gap-3">
            <Button type="submit" className="h-10 w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in as selected user"}
            </Button>
            <DisabledGoogleButton />
            <p className="text-center text-xs text-muted-foreground">
              Development sandbox only. Quick sign-in is always disabled in
              production.
            </p>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

function MagicLinkForm({ invalidLink }: { invalidLink: boolean }) {
  const [state, formAction, pending] = useActionState(
    requestMagicLink,
    initialLoginState,
  );

  return (
    <Card className="ring-border">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Welcome back</CardTitle>
        <CardDescription>
          We’ll email you a secure, one-time sign-in link.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="h-10"
            />
          </div>
          <LoginFeedback invalidLink={invalidLink} state={state} />
        </CardContent>
        <CardFooter className="mt-4 border-t-0 bg-transparent">
          <div className="grid w-full gap-3">
            <Button type="submit" className="h-10 w-full" disabled={pending}>
              {pending ? "Sending link…" : "Email me a sign-in link"}
            </Button>
            <DisabledGoogleButton />
            <p className="text-center text-xs text-muted-foreground">
              Sandbox access is invite-only. Emails appear in local Mailpit.
            </p>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

export function LoginForm({
  invalidLink = false,
  quickSignInOptions,
}: {
  invalidLink?: boolean;
  quickSignInOptions: readonly SandboxQuickSignInOption[];
}) {
  return quickSignInOptions.length > 0 ? (
    <QuickSignInForm invalidLink={invalidLink} options={quickSignInOptions} />
  ) : (
    <MagicLinkForm invalidLink={invalidLink} />
  );
}

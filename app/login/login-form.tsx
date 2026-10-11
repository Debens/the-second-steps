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
import { requestMagicLink } from "./actions";
import { initialLoginState } from "./login-state";

export function LoginForm({ invalidLink = false }: { invalidLink?: boolean }) {
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
          {(invalidLink || state.message) && (
            <p
              role={
                state.status === "error" || invalidLink ? "alert" : "status"
              }
              className={
                state.status === "error" || invalidLink
                  ? "text-sm text-destructive"
                  : "text-sm text-success"
              }
            >
              {invalidLink
                ? "That sign-in link is invalid or has expired. Request a new one."
                : state.message}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-4 border-t-0 bg-transparent">
          <div className="grid w-full gap-3">
            <Button type="submit" className="h-10 w-full" disabled={pending}>
              {pending ? "Sending link…" : "Email me a sign-in link"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
              disabled
            >
              Continue with Google (coming next)
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Sandbox access is invite-only. Emails appear in local Mailpit.
            </p>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

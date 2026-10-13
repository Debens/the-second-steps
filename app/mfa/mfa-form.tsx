"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/core/auth/supabase-browser";

type Enrolment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type Preparation =
  | { kind: "already-verified" }
  | { kind: "challenge"; factorId: string }
  | { kind: "enrol"; enrolment: Enrolment };

export function MfaForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const preparationRef = useRef<Promise<Preparation> | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<
    "loading" | "ready" | "submitting" | "error"
  >("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    if (!preparationRef.current) {
      preparationRef.current = (async () => {
        const { data: assurance, error: assuranceError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assuranceError) throw assuranceError;

        if (assurance.currentLevel === "aal2") {
          return { kind: "already-verified" };
        }

        const { data: factors, error: factorsError } =
          await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;

        const verifiedFactor = factors.totp.find(
          (factor) => factor.status === "verified",
        );
        if (verifiedFactor) {
          return { kind: "challenge", factorId: verifiedFactor.id };
        }

        const unverifiedFactors = factors.all.filter(
          (factor) =>
            factor.factor_type === "totp" && factor.status === "unverified",
        );
        for (const factor of unverifiedFactors) {
          const { error } = await supabase.auth.mfa.unenroll({
            factorId: factor.id,
          });
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "Zayto authenticator",
          issuer: "Zayto",
        });
        if (error) throw error;

        return {
          kind: "enrol",
          enrolment: {
            factorId: data.id,
            qrCode: data.totp.qr_code,
            secret: data.totp.secret,
          },
        };
      })();
    }

    preparationRef.current
      .then((preparation) => {
        if (!active) return;

        if (preparation.kind === "already-verified") {
          router.replace(nextPath);
          router.refresh();
          return;
        }

        if (preparation.kind === "challenge") {
          setFactorId(preparation.factorId);
        } else {
          setFactorId(preparation.enrolment.factorId);
          setEnrolment(preparation.enrolment);
        }
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setMessage(
          "Two-step verification could not be prepared. Refresh the page and try again.",
        );
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [nextPath, router, supabase]);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code)) {
      setMessage("Enter the six-digit code from your authenticator app.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (error) {
      setMessage("That code was not accepted. Check the code and try again.");
      setStatus("ready");
      return;
    }

    await supabase.auth.refreshSession();
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {enrolment ? "Set up your authenticator" : "Enter your code"}
        </CardTitle>
        <CardDescription>
          {enrolment
            ? "Scan this QR code with your authenticator app, then enter the six-digit code it shows."
            : "Open your authenticator app and enter the current six-digit code."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {status === "loading" && (
          <p className="text-sm text-muted-foreground">
            Preparing secure verification…
          </p>
        )}

        {enrolment && (
          <div className="grid justify-items-center gap-3 rounded-lg bg-white p-4 text-black">
            <Image
              unoptimized
              src={enrolment.qrCode.trimEnd()}
              alt="Authenticator setup QR code"
              width={200}
              height={200}
            />
            <details className="w-full text-xs">
              <summary className="cursor-pointer font-medium">
                Cannot scan the code?
              </summary>
              <p data-testid="totp-secret" className="mt-2 break-all font-mono">
                {enrolment.secret}
              </p>
            </details>
          </div>
        )}

        {status !== "loading" && (
          <form onSubmit={verify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Six-digit code</Label>
              <Input
                id="mfa-code"
                name="code"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                disabled={status === "submitting" || status === "error"}
                required
              />
            </div>
            {message && (
              <p role="alert" className="text-sm text-destructive">
                {message}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={
                !factorId || status === "submitting" || status === "error"
              }
            >
              {status === "submitting" ? "Checking…" : "Continue securely"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

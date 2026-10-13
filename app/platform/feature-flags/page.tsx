import { Flag } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireMfaUser } from "@/core/auth/mfa";
import { listFeatureFlags } from "@/core/feature-flags/application/manage-feature-flags";
import { FeatureFlagForm } from "./feature-flag-form";

export const metadata: Metadata = {
  title: "Feature flags | Zayto",
};

export default async function FeatureFlagsPage() {
  const user = await requireMfaUser("/platform/feature-flags");
  const flags = await listFeatureFlags(user.id);
  if (!flags) redirect("/access-denied");

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Platform settings</p>
        <h1 className="text-2xl font-semibold tracking-tight">Feature flags</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Release features globally or to verified Zayto users for testing.
          Company-specific controls will live on each company profile.
        </p>
      </div>

      {flags.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No feature flags are configured</CardTitle>
            <CardDescription>
              The fixed flag definitions have not been installed in this
              environment.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {flags.map((flag) => (
        <Card key={flag.key}>
          <CardHeader>
            <div className="flex items-start gap-3">
              <Flag aria-hidden="true" className="mt-0.5 size-5 text-primary" />
              <div>
                <CardTitle>{flag.displayName}</CardTitle>
                <CardDescription>{flag.description}</CardDescription>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {flag.key}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FeatureFlagForm flag={flag} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { Flag } from "lucide-react";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireMfaUser } from "@/core/auth/mfa";
import { listCustomerFeatureFlags } from "@/core/platform/application/customer-feature-flags";
import { CustomerFeatureFlagForm } from "./customer-feature-flag-form";

export default async function CustomerFeatureFlagsPage({
  params,
}: {
  params: Promise<{ customerSlug: string }>;
}) {
  const { customerSlug } = await params;
  const path = `/platform/customers/${customerSlug}/feature-flags`;
  const user = await requireMfaUser(path);
  const flags = await listCustomerFeatureFlags(user.id, customerSlug);
  if (!flags) notFound();

  if (flags.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Flag aria-hidden="true" className="size-5 text-primary" />
          <CardTitle>No feature flags</CardTitle>
          <CardDescription>
            No active feature flags are configured for customer rollout.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
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
            <CustomerFeatureFlagForm customerSlug={customerSlug} flag={flag} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

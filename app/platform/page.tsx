import { Building2, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Platform | Zayto",
};

const areas = [
  {
    title: "Customers",
    description: "View customer profiles, branches and rollout settings.",
    icon: Building2,
    href: "/platform/customers",
  },
  {
    title: "Users",
    description: "View identities and their platform or customer access.",
    icon: Users,
    href: "/platform/users",
  },
];

export default function PlatformPage() {
  return (
    <div className="grid max-w-6xl gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Internal context</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Platform overview
        </h1>
      </div>

      <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-primary"
        />
        <div>
          <p className="font-medium">Platform Owner access is active</p>
          <p className="text-muted-foreground">
            This shell manages Zayto itself. It does not provide standing access
            to customer records.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {areas.map(({ description, href, icon: Icon, title }) => (
          <Card key={title}>
            <CardHeader>
              <Icon aria-hidden="true" className="size-5 text-primary" />
              <CardTitle>
                <Link
                  href={href}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {title}
                </Link>
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Customer CRM records remain outside this platform context.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

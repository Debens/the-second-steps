import { Building2, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
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
    title: "Customer workspaces",
    description: "Workspace lifecycle controls will appear here.",
    icon: Building2,
  },
  {
    title: "Platform access",
    description: "Platform Owner management will appear here.",
    icon: Users,
  },
];

export default function PlatformPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6">
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
        {areas.map(({ description, icon: Icon, title }) => (
          <Card key={title}>
            <CardHeader>
              <Icon aria-hidden="true" className="size-5 text-primary" />
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                No customer data is exposed in this proof-of-concept view.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import {
  Building2,
  CalendarDays,
  Inbox,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  { label: "Properties", icon: Building2 },
  { label: "Landlords", icon: Users },
  { label: "Enquiries", icon: Inbox },
  { label: "Viewings", icon: CalendarDays },
];

export default function WorkspaceDashboardPage() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Overview</p>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      <div className="flex gap-3 rounded-lg bg-info-soft p-4 text-sm text-info">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-medium">Protected workspace</p>
          <p>
            Workspace membership, role permissions and database isolation are
            active. MFA is staged behind a feature flag during development and
            is mandatory for release. CRM records remain unavailable until their
            product slice is implemented.
          </p>
        </div>
      </div>

      <section aria-labelledby="modules-heading" className="grid gap-4">
        <div>
          <h2 id="modules-heading" className="text-lg font-semibold">
            Future modules
          </h2>
          <p className="text-sm text-muted-foreground">
            A role does not unlock a module without its entitlement and records.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {modules.map(({ icon: Icon, label }) => (
            <Card key={label}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">—</p>
                <p className="text-xs text-muted-foreground">
                  Not connected yet
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

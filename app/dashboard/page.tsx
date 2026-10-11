import {
  Building2,
  CalendarDays,
  Inbox,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/core/auth/supabase-server";

const modules = [
  { label: "Properties", icon: Building2 },
  { label: "Landlords", icon: Users },
  { label: "Enquiries", icon: Inbox },
  { label: "Viewings", icon: CalendarDays },
];

export default async function DashboardPage() {
  await requireUser();

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Overview</p>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      <div className="flex gap-3 rounded-lg bg-info-soft p-4 text-sm text-info">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-medium">Safe sandbox mode</p>
          <p>
            Authentication is live, but CRM data stays unavailable until
            organisation membership and MFA protection are added.
          </p>
        </div>
      </div>

      <section aria-labelledby="modules-heading" className="grid gap-4">
        <div>
          <h2 id="modules-heading" className="text-lg font-semibold">
            Phase 1 modules
          </h2>
          <p className="text-sm text-muted-foreground">
            The shell is ready; these records have not been built yet.
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

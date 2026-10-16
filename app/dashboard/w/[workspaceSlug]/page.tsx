import {
  AlertCircle,
  CalendarDays,
  CheckSquare2,
  Inbox,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceAccessContext } from "@/core/access/application/access-context";
import { requireMfaUser } from "@/core/auth/mfa";
import { getEnquiryNeedsAttention } from "@/core/enquiries/application/enquiry-tasks";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const path = `/dashboard/w/${workspaceSlug}`;
  const user = await requireMfaUser(path, { workspaceSlug });
  const [context, attention] = await Promise.all([
    getWorkspaceAccessContext(user.id, workspaceSlug),
    getEnquiryNeedsAttention({
      authSubject: user.id,
      workspaceSlug,
      upcomingDays: 7,
    }),
  ]);
  if (!context) redirect("/access-denied");
  const enquiriesPath = `${path}/enquiries`;
  const overdue = attention.tasks.filter(
    ({ dueOn }) => dueOn < attention.today,
  );
  const upcoming = attention.tasks.filter(
    ({ dueOn }) => dueOn >= attention.today,
  );
  const groups = [
    {
      label: "Awaiting a next action",
      icon: Inbox,
      items: attention.unactionedEnquiries,
      tone: "text-warning",
      empty: "Every new landlord lead has a next action.",
      detail: (item: (typeof attention.unactionedEnquiries)[number]) =>
        `Received ${dateFormat.format(item.createdAt)}`,
    },
    {
      label: "Today's appraisals",
      icon: CalendarDays,
      items: attention.todaysAppraisals,
      tone: "text-info",
      empty: "No appraisals assigned to you today.",
      detail: (item: (typeof attention.todaysAppraisals)[number]) =>
        timeFormat.format(item.scheduledAt),
    },
    {
      label: "Overdue actions",
      icon: AlertCircle,
      items: overdue,
      tone: "text-destructive",
      empty: "You have no overdue landlord-lead actions.",
      detail: (item: (typeof overdue)[number]) =>
        `Due ${dateFormat.format(item.dueOn)}`,
    },
    {
      label: "Next 7 days",
      icon: CheckSquare2,
      items: upcoming,
      tone: "text-primary",
      empty: "You have no landlord-lead actions due in the next 7 days.",
      detail: (item: (typeof upcoming)[number]) =>
        `Due ${dateFormat.format(item.dueOn)}`,
    },
  ];

  return (
    <div className="grid gap-8">
      <header>
        <p className="text-sm text-muted-foreground">Overview</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Needs attention
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your landlord-lead work for today and the coming week.
        </p>
      </header>
      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        aria-label="Landlord-lead work needing attention"
      >
        {groups.map(({ label, icon: Icon, items, tone, empty, detail }) => (
          <Card key={label} className="min-w-0">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon aria-hidden="true" className={`size-4 ${tone}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{items.length}</p>
              {items.length ? (
                <ul className="mt-4 grid divide-y">
                  {items.slice(0, 5).map((item) => {
                    const enquiry = "enquiry" in item ? item.enquiry : item;
                    return (
                      <li key={item.id} className="py-3 first:pt-0">
                        <Link
                          className="block hover:text-primary"
                          href={`${enquiriesPath}/${enquiry.id}`}
                        >
                          <span className="block truncate text-sm font-medium">
                            {enquiry.enquirerName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {detail(item as never)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">{empty}</p>
              )}
              {items.length > 5 && (
                <Link
                  href={enquiriesPath}
                  className="mt-3 inline-block text-xs font-medium text-primary"
                >
                  View all
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </section>
      <div className="flex gap-3 rounded-lg bg-info-soft p-4 text-sm text-info">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-medium">Protected workspace</p>
          <p>
            Workspace membership, role permissions and database isolation are
            active. Records remain limited to your permitted branch scope.
          </p>
        </div>
      </div>
    </div>
  );
}

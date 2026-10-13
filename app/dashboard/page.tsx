import { Building2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ZaytoWordmark } from "@/components/brand/zayto-wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAccessDestinations } from "@/core/access/application/access-context";
import { resolveAccessDestination } from "@/core/access/application/destination";
import { requireMfaUser } from "@/core/auth/mfa";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const user = await requireMfaUser("/dashboard");
  const access = await getAccessDestinations(user.id);

  if (!access) return <NoAccess email={user.email} />;

  const destination = resolveAccessDestination(access);
  if (destination.kind === "platform" || destination.kind === "workspace") {
    redirect(destination.href);
  }

  if (destination.kind === "no_access") return <NoAccess email={user.email} />;

  return (
    <div className="relative min-h-screen bg-background px-4 py-20 sm:px-6">
      <ThemeToggle className="absolute top-4 right-4" />
      <main className="mx-auto grid max-w-3xl gap-8">
        <ZaytoWordmark />
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Choose context</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Where would you like to work?
          </h1>
          <p className="text-sm text-muted-foreground">
            Platform administration and customer workspaces remain separate.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {access.isPlatformOwner && (
            <ContextCard
              href="/platform"
              icon={<ShieldCheck className="size-5 text-primary" />}
              title="Zayto platform"
              description="Internal platform administration"
            />
          )}
          {access.workspaces.map((workspace) => (
            <ContextCard
              key={workspace.id}
              href={`/dashboard/w/${workspace.slug}`}
              icon={<Building2 className="size-5 text-primary" />}
              title={workspace.displayName}
              description="Customer workspace"
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function ContextCard({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardHeader>
          {icon}
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

function NoAccess({ email }: { email?: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-20 sm:px-6">
      <ThemeToggle className="absolute top-4 right-4" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>Access has not been granted</h1>
          </CardTitle>
          <CardDescription>
            You are signed in{email ? ` as ${email}` : ""}, but this identity
            has no active platform role or customer workspace membership.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign out
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

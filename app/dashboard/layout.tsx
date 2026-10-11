import { LogOut } from "lucide-react";
import { DesktopNavigation, MobileNavigation } from "./dashboard-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/core/auth/supabase-server";
import { signOut } from "./actions";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-background lg:flex">
      <DesktopNavigation />
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center gap-3 border-b bg-card px-4 md:px-6 lg:px-8">
          <MobileNavigation />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Zayto sandbox</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <ThemeToggle />
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              aria-label="Sign out"
            >
              <LogOut aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </header>
        <main className="px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

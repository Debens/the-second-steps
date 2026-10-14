import type { Metadata } from "next";
import { ZaytoWordmark } from "@/components/brand/zayto-wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LoginForm } from "./login-form";
import { getSandboxQuickSignInOptions } from "@/core/auth/config";
import { createSupabaseServerClient } from "@/core/auth/supabase-server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login | Zayto",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");

  const { error } = await searchParams;
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <ZaytoWordmark />
        <div className="max-w-sm space-y-3">
          <p className="text-2xl font-semibold leading-snug tracking-tight">
            Lettings and property management for UK agencies.
          </p>
          <p className="text-sm text-sidebar-muted-foreground">
            Properties, landlords, tenants and tenancies in one place.
          </p>
        </div>
        <p className="text-xs text-sidebar-muted-foreground">
          Proof of concept
        </p>
      </aside>

      <main className="relative flex items-center justify-center bg-background px-4 pt-20 pb-10 sm:px-6">
        <ThemeToggle className="absolute top-4 right-4" />
        <div className="w-full max-w-sm space-y-8">
          <ZaytoWordmark className="lg:hidden" />
          {error === "access-setup" && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              Your sign-in was verified, but the local access profile could not
              be prepared. Try again or check the development server logs.
            </p>
          )}
          <LoginForm
            invalidLink={error === "invalid-link"}
            quickSignInOptions={getSandboxQuickSignInOptions()}
          />
        </div>
      </main>
    </div>
  );
}

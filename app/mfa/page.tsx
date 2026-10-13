import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ZaytoWordmark } from "@/components/brand/zayto-wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { safePostMfaPath } from "@/core/auth/mfa-path";
import { createSupabaseServerClient } from "@/core/auth/supabase-server";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = {
  title: "Two-step verification | Zayto",
};

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: assurance } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const nextPath = safePostMfaPath((await searchParams).next);
  if (assurance?.currentLevel === "aal2") redirect(nextPath);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-20 sm:px-6">
      <ThemeToggle className="absolute top-4 right-4" />
      <main className="w-full max-w-md space-y-8">
        <ZaytoWordmark />
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Secure access</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Two-step verification
          </h1>
          <p className="text-sm text-muted-foreground">
            Business and platform accounts require an authenticator app before
            workspace information is shown.
          </p>
        </div>
        <MfaForm nextPath={nextPath} />
      </main>
    </div>
  );
}

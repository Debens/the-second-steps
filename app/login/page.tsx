import type { Metadata } from "next";
import { ZaytoWordmark } from "@/components/brand/zayto-wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login | Zayto",
};

export default function LoginPage() {
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
          <LoginForm />
        </div>
      </main>
    </div>
  );
}

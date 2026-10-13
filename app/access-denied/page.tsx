import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/core/auth/supabase-server";

export default async function AccessDeniedPage() {
  await requireUser();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-20">
      <ThemeToggle className="absolute top-4 right-4" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>Access denied</h1>
          </CardTitle>
          <CardDescription>
            Your identity does not have access to that area. No information
            about the requested workspace has been revealed.
          </CardDescription>
          <Button
            render={<Link href="/dashboard" />}
            nativeButton={false}
            className="mt-4"
          >
            Return to your dashboard
          </Button>
        </CardHeader>
      </Card>
    </div>
  );
}

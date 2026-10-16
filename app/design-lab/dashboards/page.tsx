import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardLab } from "@/components/design-lab/dashboards/dashboard-lab";
import { requireMfaUser } from "@/core/auth/mfa";

export const metadata: Metadata = {
  title: "Dashboard options · Zayto",
  robots: { index: false, follow: false },
};

export default async function DashboardLabPage() {
  if (process.env.NODE_ENV === "production") notFound();

  await requireMfaUser("/design-lab/dashboards");

  return <DashboardLab />;
}

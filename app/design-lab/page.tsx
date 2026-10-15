import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignLab } from "@/components/design-lab/design-lab";
import { requireMfaUser } from "@/core/auth/mfa";

export const metadata: Metadata = {
  title: "UI Design Lab · Zayto",
  robots: { index: false, follow: false },
};

export default async function DesignLabPage() {
  if (process.env.NODE_ENV === "production") notFound();

  await requireMfaUser("/design-lab");

  return <DesignLab />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactPageLab } from "@/components/design-lab/contact-page-lab";
import { requireMfaUser } from "@/core/auth/mfa";

export const metadata: Metadata = {
  title: "Contact page options · Zayto",
  robots: { index: false, follow: false },
};

export default async function ContactPageLabPage() {
  if (process.env.NODE_ENV === "production") notFound();

  await requireMfaUser("/design-lab/contact");

  return <ContactPageLab />;
}

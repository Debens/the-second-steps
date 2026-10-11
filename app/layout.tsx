import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "@/styles/globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Zayto",
  description: "UK residential lettings and property management CRM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={geistSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

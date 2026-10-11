import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeSync } from "@/components/theme/theme-sync";
import { themeScript } from "@/components/theme/theme";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    // The <head> script adds the "dark" class before React loads, so React must accept the difference.
    <html lang="en-GB" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}

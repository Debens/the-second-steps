"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_TABS = [
  { label: "Details", segment: "" },
  { label: "Users & access", segment: "/users" },
  { label: "Branches", segment: "/branches" },
  { label: "Enquiry lists", segment: "/enquiries" },
] as const;

export function SettingsTabs({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();
  const base = `/dashboard/w/${workspaceSlug}/settings`;

  return (
    <nav aria-label="Settings" className="overflow-x-auto">
      <div className="flex min-w-max gap-1 rounded-xl bg-muted p-1">
        {SETTINGS_TABS.map((tab) => {
          const href = `${base}${tab.segment}`;
          const active = pathname === href;

          return (
            <Link
              key={tab.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

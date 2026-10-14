"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_TABS = [
  { label: "Details", segment: "" },
  { label: "Users & access", segment: "/users" },
  { label: "Branches", segment: "/branches" },
] as const;

export function SettingsTabs({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();
  const base = `/dashboard/w/${workspaceSlug}/settings`;

  return (
    <nav aria-label="Settings" className="overflow-x-auto border-b">
      <div className="flex min-w-max gap-1">
        {SETTINGS_TABS.map((tab) => {
          const href = `${base}${tab.segment}`;
          const active = pathname === href;

          return (
            <Link
              key={tab.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
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

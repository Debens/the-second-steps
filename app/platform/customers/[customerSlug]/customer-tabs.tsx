"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Overview", segment: "" },
  { label: "Users", segment: "/users" },
  { label: "Branches", segment: "/branches" },
  { label: "Feature flags", segment: "/feature-flags" },
] as const;

export function CustomerTabs({ customerSlug }: { customerSlug: string }) {
  const pathname = usePathname();
  const base = `/platform/customers/${customerSlug}`;

  return (
    <nav aria-label="Customer profile" className="overflow-x-auto">
      <div className="flex min-w-max gap-1 rounded-xl bg-muted p-1">
        {TABS.map((tab) => {
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

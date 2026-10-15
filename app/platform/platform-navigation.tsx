"use client";

import { Building2, Flag, LayoutDashboard, Menu, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const ITEMS = [
  { label: "Platform overview", icon: LayoutDashboard, href: "/platform" },
  { label: "Users", icon: Users, href: "/platform/users" },
  { label: "Customers", icon: Building2, href: "/platform/customers" },
  { label: "Feature flags", icon: Flag, href: "/platform/feature-flags" },
] as const;

export function PlatformNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Platform navigation" className="grid gap-1">
      {ITEMS.map(({ href, icon: Icon, label }) => {
        const active =
          pathname === href ||
          (href !== "/platform" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PlatformMobileNavigation() {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="outline" size="icon" className="lg:hidden" />}
      >
        <Menu aria-hidden="true" />
        <span className="sr-only">Open platform navigation</span>
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar text-sidebar-foreground">
        <SheetHeader>
          <SheetTitle className="text-sidebar-foreground">
            Zayto platform
          </SheetTitle>
          <SheetDescription className="text-sidebar-muted-foreground">
            Internal administration
          </SheetDescription>
        </SheetHeader>
        <div className="px-2">
          <PlatformNavigation />
        </div>
      </SheetContent>
    </Sheet>
  );
}

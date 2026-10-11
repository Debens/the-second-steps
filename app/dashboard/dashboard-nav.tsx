"use client";

import {
  Building2,
  CalendarDays,
  Home,
  Inbox,
  Menu,
  Users,
} from "lucide-react";
import { ZaytoWordmark } from "@/components/brand/zayto-wordmark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const items = [
  { label: "Overview", icon: Home, active: true },
  { label: "Properties", icon: Building2 },
  { label: "Landlords", icon: Users },
  { label: "Enquiries", icon: Inbox },
  { label: "Viewings", icon: CalendarDays },
];

function NavigationItems() {
  return (
    <nav aria-label="Main navigation" className="grid gap-1">
      {items.map(({ active, icon: Icon, label }) => (
        <div
          key={label}
          aria-current={active ? "page" : undefined}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
            active
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-muted-foreground"
          }`}
        >
          <Icon aria-hidden="true" className="size-4" />
          <span>{label}</span>
          {!active && <span className="ml-auto text-xs">Soon</span>}
        </div>
      ))}
    </nav>
  );
}

export function DesktopNavigation() {
  return (
    <aside className="hidden min-h-screen w-64 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground lg:flex">
      <ZaytoWordmark />
      <div className="mt-10">
        <NavigationItems />
      </div>
      <p className="mt-auto text-xs text-sidebar-muted-foreground">
        Proof-of-concept sandbox
      </p>
    </aside>
  );
}

export function MobileNavigation() {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="outline" size="icon" className="lg:hidden" />}
      >
        <Menu aria-hidden="true" />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar text-sidebar-foreground">
        <SheetHeader>
          <SheetTitle className="text-sidebar-foreground">
            <ZaytoWordmark />
          </SheetTitle>
          <SheetDescription className="text-sidebar-muted-foreground">
            Proof-of-concept sandbox
          </SheetDescription>
        </SheetHeader>
        <div className="px-2">
          <NavigationItems />
        </div>
      </SheetContent>
    </Sheet>
  );
}

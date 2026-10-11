"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { parseThemePreference, type ThemePreference } from "./theme";
import { saveThemePreference, useThemePreference } from "./theme-store";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  Icon: typeof SunIcon;
}[] = [
  { value: "light", label: "Light theme", Icon: SunIcon },
  { value: "dark", label: "Dark theme", Icon: MoonIcon },
  { value: "system", label: "Use device setting", Icon: MonitorIcon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const preference = useThemePreference();

  return (
    <ToggleGroup
      aria-label="Colour theme"
      value={[preference]}
      onValueChange={(next) => {
        const chosen = next[0];
        if (chosen) saveThemePreference(parseThemePreference(chosen));
      }}
      variant="outline"
      spacing={0}
      className={cn("bg-card", className)}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={label}
          title={label}
          className="text-muted-foreground aria-pressed:bg-accent aria-pressed:text-primary"
        >
          <Icon aria-hidden="true" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

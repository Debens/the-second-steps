"use client";

import { useLayoutEffect } from "react";
import {
  applyThemePreference,
  readThemePreference,
  subscribeToTheme,
} from "./theme-store";

// The <head> script sets the theme on first load. This keeps it correct afterwards:
// when "System" is chosen and the device switches, and after React's development
// remount clears the class from <html>.
export function ThemeSync() {
  useLayoutEffect(() => {
    const sync = () => applyThemePreference(readThemePreference());
    sync();
    return subscribeToTheme(sync);
  }, []);

  return null;
}

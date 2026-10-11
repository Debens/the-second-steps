"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_THEME_PREFERENCE,
  readThemeCookie,
  resolveTheme,
  SYSTEM_DARK_QUERY,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE_SECONDS,
  type ThemePreference,
} from "./theme";

const CHANGE_EVENT = "zayto-theme-change";

export function readThemePreference(): ThemePreference {
  return readThemeCookie(document.cookie);
}

export function applyThemePreference(preference: ThemePreference) {
  const systemPrefersDark = window.matchMedia(SYSTEM_DARK_QUERY).matches;
  document.documentElement.classList.toggle(
    "dark",
    resolveTheme(preference, systemPrefersDark) === "dark",
  );
}

export function saveThemePreference(preference: ThemePreference) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${THEME_COOKIE}=${preference}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  applyThemePreference(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToTheme(onChange: () => void) {
  const systemQuery = window.matchMedia(SYSTEM_DARK_QUERY);
  window.addEventListener(CHANGE_EVENT, onChange);
  systemQuery.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    systemQuery.removeEventListener("change", onChange);
  };
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(
    subscribeToTheme,
    readThemePreference,
    () => DEFAULT_THEME_PREFERENCE,
  );
}

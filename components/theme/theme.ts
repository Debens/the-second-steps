export const THEME_PREFERENCES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = "light" | "dark";

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "light";
export const THEME_COOKIE = "zayto-theme";
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

export function parseThemePreference(
  value: string | null | undefined,
): ThemePreference {
  return (
    THEME_PREFERENCES.find((preference) => preference === value) ??
    DEFAULT_THEME_PREFERENCE
  );
}

export function readThemeCookie(cookieHeader: string): ThemePreference {
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]*)`),
  );
  return parseThemePreference(match?.[1]);
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

// Runs in <head> before first paint, so it cannot import anything; keep it in step with the functions above.
export const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=(light|dark|system)(?:;|$)/);var p=m?m[1]:"${DEFAULT_THEME_PREFERENCE}";var d=p==="dark"||(p==="system"&&window.matchMedia("${SYSTEM_DARK_QUERY}").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;

import { describe, expect, test } from "vitest";
import {
  DEFAULT_THEME_PREFERENCE,
  parseThemePreference,
  readThemeCookie,
  resolveTheme,
  themeScript,
} from "./theme";

describe("theme preference", () => {
  test("defaults to light", () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe("light");
    expect(parseThemePreference(undefined)).toBe("light");
    expect(parseThemePreference("purple")).toBe("light");
  });

  test("reads the saved choice from the cookie", () => {
    expect(readThemeCookie("a=1; zayto-theme=dark; b=2")).toBe("dark");
    expect(readThemeCookie("zayto-theme=system")).toBe("system");
    expect(readThemeCookie("other-zayto-theme=dark")).toBe("light");
    expect(readThemeCookie("")).toBe("light");
  });

  test("System follows the device", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("first-paint script", () => {
  function run(cookie: string, systemPrefersDark: boolean) {
    const classes = new Set<string>();
    const document = {
      cookie,
      documentElement: {
        classList: {
          toggle: (name: string, on: boolean) =>
            on ? classes.add(name) : classes.delete(name),
        },
      },
    };
    const window = { matchMedia: () => ({ matches: systemPrefersDark }) };
    new Function("document", "window", themeScript)(document, window);
    return classes.has("dark");
  }

  test("agrees with resolveTheme for every saved choice", () => {
    for (const cookie of ["", "zayto-theme=light", "zayto-theme=bogus"]) {
      expect(run(cookie, true)).toBe(false);
    }
    expect(run("zayto-theme=dark", false)).toBe(true);
    expect(run("x=1; zayto-theme=system", true)).toBe(true);
    expect(run("zayto-theme=system", false)).toBe(false);
  });
});

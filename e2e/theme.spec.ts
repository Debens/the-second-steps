import { devices, expect, test } from "@playwright/test";

const html = (page: import("@playwright/test").Page) => page.locator("html");

test("light is the default, even when the device prefers dark", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  await expect(html(page)).not.toHaveClass(/\bdark\b/);
  await expect(
    page.getByRole("button", { name: "Light theme" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("choosing Dark applies immediately and is remembered after reload", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(html(page)).toHaveClass(/\bdark\b/);

  await page.reload();
  await expect(html(page)).toHaveClass(/\bdark\b/);
  await expect(
    page.getByRole("button", { name: "Dark theme" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("Use device setting follows the device as it changes", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  await page.getByRole("button", { name: "Use device setting" }).click();
  await expect(html(page)).toHaveClass(/\bdark\b/);

  await page.emulateMedia({ colorScheme: "light" });
  await expect(html(page)).not.toHaveClass(/\bdark\b/);
});

test.describe("on a touchscreen phone", () => {
  const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } =
    devices["Pixel 7"];
  test.use({ viewport, deviceScaleFactor, isMobile, hasTouch, userAgent });

  test("controls are at least 44px tall", async ({ page }) => {
    await page.goto("/login");
    for (const control of [
      page.getByLabel("Email"),
      page.getByRole("button", { name: "Email me a sign-in link" }),
      page.getByRole("button", { name: "Dark theme" }),
    ]) {
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
});

import { expect, test } from "@playwright/test";

test("the home page redirects to login", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page).toHaveTitle("Login | Zayto");
});

test("login form explains the local magic-link flow", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle("Login | Zayto");

  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Email me a sign-in link" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Continue with Google (coming next)" }),
  ).toBeDisabled();
  await expect(page.getByText(/Sandbox access is invite-only/)).toBeVisible();
});

test("keyboard users see a blue focus outline on the email field", async ({
  page,
}) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  const email = page.getByLabel("Email");
  const submit = page.getByRole("button", { name: "Email me a sign-in link" });

  await submit.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(email).toBeFocused();
  await expect(email).toHaveCSS("border-color", "rgb(29, 78, 216)");
});

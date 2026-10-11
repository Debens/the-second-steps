import { expect, test } from "@playwright/test";

test("login form shows the placeholder message on submit", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle("Login | Zayto");

  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Password").fill("not-a-real-password");
  await page.getByRole("button", { name: "Log In" }).click();

  await expect(
    page.getByText("Form submitted! (No real authentication yet)"),
  ).toBeVisible();
});

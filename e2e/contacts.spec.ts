import { expect, test, type Page } from "@playwright/test";

const WORKSPACE = "/dashboard/w/oakfield-lettings-demo";

test.describe.configure({ mode: "serial" });

async function signInAsOwner(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Sandbox user").click();
  await page.getByRole("option").filter({ hasText: "Olivia Hart" }).click();
  await page.getByRole("button", { name: "Sign in as selected user" }).click();
  await expect(page).toHaveURL(new RegExp(`${WORKSPACE}$`), {
    timeout: 10_000,
  });
}

test("contact list and person creation path are available", async ({
  page,
}) => {
  await signInAsOwner(page);
  await page.getByRole("link", { name: "Contacts" }).click();
  await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible();
  await expect(page.getByLabel("Search contacts")).toBeVisible();

  await page.getByRole("link", { name: "New contact" }).click();
  await page.getByRole("link", { name: "Create person" }).click();
  await expect(page.getByRole("heading", { name: "New person" })).toBeVisible();
  await expect(page.getByLabel("First name")).toBeVisible();
  await expect(page.getByLabel("Responsible branch")).toHaveValue(/.+/);
  await expect(
    page.getByRole("button", { name: "Create contact" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/contact-person-desktop.png",
    fullPage: true,
  });
});

test("organisation form is usable on mobile and in dark mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAsOwner(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Contacts" }).click();
  await page.getByRole("link", { name: "New contact" }).click();
  await page.getByRole("link", { name: "Create organisation" }).click();
  await expect(
    page.getByRole("heading", { name: "New organisation" }),
  ).toBeVisible();

  const sameAddress = page.getByLabel(
    "Correspondence address is the same as the registered address",
  );
  await sameAddress.check();
  await expect(page.locator("#correspondenceAddressLine1")).toBeDisabled();
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: "test-results/contact-organisation-mobile.png",
    fullPage: true,
  });
});

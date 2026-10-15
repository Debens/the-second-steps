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

  await page.getByRole("button", { name: "New contact" }).click();
  await page.getByRole("button", { name: "Create person" }).click();
  await expect(page.getByRole("heading", { name: "New person" })).toBeVisible();
  await expect(page.getByLabel("First name")).toBeVisible();
  const branch = page.getByLabel("Responsible branch");
  await expect(branch).toContainText("Select a branch");
  await branch.click();
  await expect(page.getByRole("option", { name: "Main Branch" })).toBeVisible();
  await page.getByRole("option", { name: "Main Branch" }).click();
  await expect(branch).toContainText("Main Branch");
  await expect(
    page.getByRole("button", { name: "Create contact" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/contact-person-desktop.png",
    fullPage: true,
  });
});

test("person record keeps its detail card and consistent summary icons", async ({
  page,
}) => {
  await signInAsOwner(page);
  await page.getByRole("link", { name: "Contacts" }).click();
  await page.getByRole("link", { name: "Eleanor Price" }).click();

  const personDetails = page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Person details" });
  await expect(personDetails).toBeVisible();
  await expect(personDetails.locator("svg")).toHaveCount(4);

  const preferences = page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Preferences and branch" });
  await expect(preferences.locator("svg")).toHaveCount(3);
});

test("organisation form is usable on mobile and in dark mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAsOwner(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Contacts" }).click();
  await page.getByRole("button", { name: "New contact" }).click();
  await page.getByRole("button", { name: "Create organisation" }).click();
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

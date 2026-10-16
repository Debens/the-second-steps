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

test("enquiry workspace routes and quick capture are usable", async ({
  page,
}) => {
  await signInAsOwner(page);
  await expect(
    page.getByRole("heading", { name: "Needs attention" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Enquiries" }).click();
  await expect(
    page.getByRole("heading", { name: "Enquiries", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Search enquiries")).toBeVisible();
  await page.getByRole("button", { name: "Quick enquiry" }).click();
  await expect(
    page.getByRole("heading", { name: "Quick enquiry" }),
  ).toBeVisible();
  await expect(page.getByLabel("Landlord name")).toBeVisible();
  await expect(page.getByLabel("Responsible branch")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save enquiry" }),
  ).toBeVisible();
});

test("enquiry settings support mobile dark mode without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAsOwner(page);
  await page.goto(`${WORKSPACE}/settings/enquiries`);
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.getByRole("heading", { name: "Enquiry lists" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lead sources" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Outcome reasons" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

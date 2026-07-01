import { test, expect } from "@playwright/test";

test.describe("Admin dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/");
    await page.getByRole("button", { name: "Quick admin" }).click();
    await expect(page.getByText("Operations command center")).toBeVisible({ timeout: 60000 });
  });

  test("loads operations overview and insights nav", async ({ page }) => {
    await expect(page.getByText("Student Insights")).toBeVisible();
    await page.getByRole("button", { name: "Student Insights" }).click();
    await expect(page.getByText("Student Intelligence")).toBeVisible();
  });
});

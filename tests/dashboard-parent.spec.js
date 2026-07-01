import { test, expect } from "@playwright/test";

test.describe("Parent dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/");
    await page.getByRole("button", { name: "Quick parent" }).click();
    await expect(page.getByTestId("parent-dashboard-home")).toBeVisible({ timeout: 60000 });
  });

  test("shows multi-child family dashboard", async ({ page }) => {
    await expect(page.getByText("Family dashboard")).toBeVisible();
    await expect(page.getByText("Jayden Tan")).toBeVisible();
    await expect(page.getByText("Emma Tan")).toBeVisible();
  });

  test("read-only child report has no practice studio", async ({ page }) => {
    await page.getByRole("button", { name: /Jayden Tan/ }).first().click();
    await expect(page.getByTestId("parent-child-detail")).toBeVisible();
    await expect(page.getByText("P4 Math Studio")).toBeHidden();
  });
});

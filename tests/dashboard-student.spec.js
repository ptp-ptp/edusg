import { test, expect } from "@playwright/test";

async function ensureHome(page, role) {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
  if (role !== "student") {
    await page.getByRole("button", { name: `Quick ${role}` }).click();
    return;
  }
  await expect(page.getByTestId("student-dashboard-home").or(page.getByRole("button", { name: "Open menu" }))).toBeVisible({ timeout: 60000 });
}

test.describe("Student dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await ensureHome(page, "student");
  });

  test("home dashboard loads with subject cards", async ({ page }) => {
    await expect(page.getByTestId("student-dashboard-home")).toBeVisible();
    await expect(page.getByText("Your subjects")).toBeVisible();
  });

  test("navigates to achievements", async ({ page }) => {
    await page.getByRole("link", { name: "Achievements" }).click();
    await expect(page.getByTestId("student-achievements")).toBeVisible();
  });
});

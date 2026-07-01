import { test, expect } from "@playwright/test";

async function ensureStudentHome(page) {
  await page.goto("/");
  await expect(page.getByTestId("student-dashboard-home").or(page.getByRole("button", { name: "Open menu" }))).toBeVisible({ timeout: 60000 });
}

test.describe("iPhone mobile layout", () => {
  test.beforeEach(async ({ page }) => {
    await ensureStudentHome(page);
  });

  test("has no horizontal page overflow", async ({ page }) => {
    const hasOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth + 1;
    });
    expect(hasOverflow).toBe(false);
  });

  test("shows compact header without role switcher on learn page", async ({ page }) => {
    await page.goto("/learn/math");
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    await expect(page.getByText(/Math · P4/)).toBeVisible();
    await expect(page.getByText("student", { exact: true })).toBeHidden();
  });

  test("bottom tabs switch Learn, Progress, and Family panels", async ({ page }) => {
    await page.goto("/learn/math");
    const bottomNav = page.getByTestId("mobile-bottom-nav");
    await expect(bottomNav).toBeVisible();

    await expect(page.getByText("P4 Math Studio")).toBeVisible();
    await expect(page.getByTestId("mobile-progress-panel")).toBeHidden();
    await expect(page.getByTestId("mobile-family-panel")).toBeHidden();

    await page.getByTestId("mobile-tab-progress").click();
    await expect(page.getByTestId("mobile-progress-panel")).toBeVisible();
    await expect(page.getByText("Your progress")).toBeVisible();

    await page.getByTestId("mobile-tab-family").click();
    await expect(page.getByTestId("mobile-family-panel")).toBeVisible();
    await expect(page.getByText("For Parents")).toBeVisible();

    await page.getByTestId("mobile-tab-learn").click();
    await expect(page.getByText("P4 Math Studio")).toBeVisible();
  });

  test("English learn tab fits mobile layout", async ({ page }) => {
    await page.goto("/learn/english");
    await expect(page.getByText("English Studio")).toBeVisible();
    await expect(page.getByRole("button", { name: "Show MOE English roadmap" })).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth + 1;
    });
    expect(hasOverflow).toBe(false);
  });
});

import { expect, test } from "@playwright/test";

test.describe("FoundIt smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    // Keep smoke tests independent of whether the local Express server is running.
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Unauthorized" }),
      });
    });
  });

  test("renders the landing page", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/FoundIt/i);
    await expect(page.locator("main")).toBeVisible();
  });

  test("redirects unauthenticated users from /dashboard back to /", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/\?redirect=%2Fdashboard/);
  });
});

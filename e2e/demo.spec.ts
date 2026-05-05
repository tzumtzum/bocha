import { test, expect } from "@playwright/test";

test.describe("Bobo Demo Mode", () => {
  test("login page renders and demo button navigates to dashboard", async ({ page }) => {
    await page.goto("http://localhost:3000/login");

    await expect(page.getByText(/welcome back/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /try demo mode/i }).click();

    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    await expect(page.getByText(/your flock/i)).toBeVisible();
    await expect(page.getByText(/Cockatiel/i)).toBeVisible();
  });

  test("dashboard shows bird card with streak", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.getByRole("button", { name: /try demo mode/i }).click();

    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    await expect(page.getByRole("heading", { name: /Bobo/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Cockatiel/i)).toBeVisible();
    await expect(page.getByText(/day streak/i)).toBeVisible();
  });

  test("bird detail page shows weight chart", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.getByRole("button", { name: /try demo mode/i }).click();

    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    // Click the bird card (card is now tappable)
    await page.getByText(/Cockatiel/i).click();
    await expect(page).toHaveURL(/.*birds/);
    await expect(page.getByText(/weight trend/i)).toBeVisible();
  });

  test("quick log page allows weight entry", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.getByRole("button", { name: /try demo mode/i }).click();

    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    // Navigate directly since Quick Log button was removed from bird cards
    await page.goto("http://localhost:3000/log/quick");
    await expect(page.getByRole("spinbutton")).toBeVisible();
    await expect(page.getByText(/how are they doing/i)).toBeVisible();
  });

  test("settings page is accessible", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.getByRole("button", { name: /try demo mode/i }).click();

    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    await page.goto("http://localhost:3000/settings");
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();
    await expect(page.getByText(/appearance/i)).toBeVisible();
  });

  test("bird detail page allows editing bird profile", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.getByRole("button", { name: /try demo mode/i }).click();

    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    // Click the bird card (card is now tappable)
    await page.getByText(/Cockatiel/i).click();
    await expect(page).toHaveURL(/.*birds/);

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/edit bird profile/i)).toBeVisible();

    const nameInput = page.getByLabel(/name/i);
    await nameInput.fill("Bobo Jr");
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page.getByText(/Bobo Jr/i)).toBeVisible();
  });

  test("archive and restore bird flow", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.getByRole("button", { name: /try demo mode/i }).click();

    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    // Click the bird card (card is now tappable)
    await page.getByText(/Cockatiel/i).click();
    await expect(page).toHaveURL(/.*birds/);

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /archive/i }).click();

    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    await page.goto("http://localhost:3000/settings");
    await expect(page.getByText(/archived birds/i)).toBeVisible();

    await page.getByRole("button", { name: /restore/i }).click();
    await expect(page.getByText(/archived birds/i)).not.toBeVisible();
  });

  test("settings has export and import buttons", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.getByRole("button", { name: /try demo mode/i }).click();

    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    await page.goto("http://localhost:3000/settings");
    await expect(page.getByText(/export data/i)).toBeVisible();
    await expect(page.getByText(/import data/i)).toBeVisible();
  });

  test("dashboard shows daily status summary", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.getByRole("button", { name: /try demo mode/i }).click();

    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    // The demo bird has seeded logs, so the summary should show "All caught up!"
    await expect(page.getByText(/all caught up/i)).toBeVisible();
  });

  test("bird detail page allows editing and deleting a log", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.getByRole("button", { name: /try demo mode/i }).click();

    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    // Click the bird card (card is now tappable)
    await page.getByText(/Cockatiel/i).click();
    await expect(page).toHaveURL(/.*birds/);

    // Open edit log dialog
    await page.getByRole("button", { name: /edit log/i }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/edit log/i)).toBeVisible();

    // Change weight
    const weightInput = page.locator("#edit-log-weight");
    await weightInput.fill("123");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Verify updated weight is visible
    await expect(page.getByText("123.0 g")).toBeVisible();

    // Delete the log
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /delete log/i }).first().click();

    // Verify the log is removed
    await expect(page.getByText("123.0 g")).not.toBeVisible();
  });
});

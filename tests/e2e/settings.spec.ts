import { test, expect } from "@playwright/test";

test.describe("Settings modal", () => {
  test("opens via the settings button and displays SMTP fields", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open settings" }).click();

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByPlaceholder("smtp.gmail.com")).toBeVisible();
    await expect(page.getByPlaceholder("you@gmail.com", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("App password")).toBeVisible();
    await expect(page.getByPlaceholder("Kairizon <you@gmail.com>")).toBeVisible();
  });

  test("saves updated SMTP settings and closes the modal", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open settings" }).click();

    await page.getByPlaceholder("smtp.gmail.com").fill("smtp.updated.com");

    const userInput = page.getByPlaceholder("you@gmail.com", { exact: true });
    if (!(await userInput.inputValue())) {
      await userInput.fill("updated@test.com");
    }
    const passInput = page.getByPlaceholder("App password");
    if (!(await passInput.inputValue())) {
      await passInput.fill("newpass");
    }
    const fromInput = page.getByPlaceholder("Kairizon <you@gmail.com>");
    if (!(await fromInput.inputValue())) {
      await fromInput.fill("Updated <updated@test.com>");
    }

    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).not.toBeVisible();
  });

  test("reopening settings shows the previously saved host", async ({ page, request }) => {
    // Seed a known host value independently so this test does not rely on test 2
    await request.put("/api/settings", {
      data: {
        smtpHost: "smtp.persist-check.com",
        smtpPort: 587,
        smtpUser: "persist@test.com",
        smtpPass: "persist-pass",
        smtpFrom: "Persist <persist@test.com>",
      },
    });

    await page.goto("/");
    // Wait for the settings useEffect fetch to complete before opening the modal
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Open settings" }).click();
    await expect(page.getByPlaceholder("smtp.gmail.com")).toHaveValue("smtp.persist-check.com");
  });

  test("close button dismisses the modal when SMTP is configured", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.getByRole("button", { name: "Close settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).not.toBeVisible();
  });
});

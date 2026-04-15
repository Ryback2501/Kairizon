import { test, expect } from "@playwright/test";

test.describe("Settings modal", () => {
  test("opens via the settings button and displays SMTP fields", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByPlaceholder("smtp.gmail.com")).toBeVisible();
    await expect(page.getByPlaceholder("you@gmail.com")).toBeVisible();
    await expect(page.getByPlaceholder("App password")).toBeVisible();
    await expect(page.getByPlaceholder("Kairizon <you@gmail.com>")).toBeVisible();
  });

  test("saves updated SMTP settings and closes the modal", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();

    // Update the host field
    const hostInput = page.getByPlaceholder("smtp.gmail.com");
    await hostInput.fill("smtp.updated.com");

    // Fill required fields if empty
    const userInput = page.getByPlaceholder("you@gmail.com");
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

  test("reopening settings shows the previously saved host", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    const hostInput = page.getByPlaceholder("smtp.gmail.com");
    await expect(hostInput).toHaveValue("smtp.updated.com");
  });

  test("close button dismisses the modal when SMTP is configured", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.getByRole("button", { name: "Close settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).not.toBeVisible();
  });
});

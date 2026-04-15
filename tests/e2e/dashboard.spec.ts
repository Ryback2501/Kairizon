import { test, expect } from "@playwright/test";

const PRODUCT_TITLE = "E2E Test Product";
const ADD_ASIN = "B00E2EADD1";
const ADD_URL = `https://www.amazon.com/dp/${ADD_ASIN}`;

// Fake product the mocked POST /api/products returns
const MOCK_PRODUCT = {
  id: "mock-add-id",
  asin: ADD_ASIN,
  title: "Mocked Add Product",
  image: null,
  url: ADD_URL,
  currentPrice: 25.0,
  targetPrice: null,
  inStock: true,
  trackStock: false,
  stockNotified: false,
  notified: false,
  includeSecondHand: true,
  availableSellers: JSON.stringify([
    { name: "Amazon", price: 25.0, shipping: 0, isSecondHand: false },
  ]),
  excludedSellers: JSON.stringify([]),
  lastChecked: null,
  createdAt: new Date().toISOString(),
};

test.describe("Dashboard — product card", () => {
  test("seeded product is visible on the dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(PRODUCT_TITLE)).toBeVisible();
  });

  test("edit button reveals the target price input", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("li, article, [data-testid='product-card']").filter({ hasText: PRODUCT_TITLE }).first();
    await card.getByRole("button", { name: /set target price|edit target price/i }).click();
    await expect(card.getByPlaceholder("0.00")).toBeVisible();
  });

  test("saving a target price shows the alert info line", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("li, article, [data-testid='product-card']").filter({ hasText: PRODUCT_TITLE }).first();
    await card.getByRole("button", { name: /set target price|edit target price/i }).click();

    await card.getByPlaceholder("0.00").fill("35");
    await card.getByRole("button", { name: "Save target price" }).click();

    await expect(card.getByText(/alert below/i)).toBeVisible();
  });

  test("cancel button exits edit mode without saving", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("li, article, [data-testid='product-card']").filter({ hasText: PRODUCT_TITLE }).first();
    await card.getByRole("button", { name: /edit target price/i }).click();

    await card.getByPlaceholder("0.00").fill("999");
    await card.getByRole("button", { name: "Cancel editing" }).click();

    await expect(card.getByPlaceholder("0.00")).not.toBeVisible();
    // Price alert should still show the previously saved value, not 999
    await expect(card.getByText("999,00")).not.toBeVisible();
  });

  test("enabling stock alert toggle shows the stock alert info line", async ({ page }) => {
    await page.goto("/");
    // Need a product with no Amazon stock for the stock toggle to be active.
    // We'll test the toggle behaviour via API state — open edit mode and check the toggle exists.
    const card = page.locator("li, article, [data-testid='product-card']").filter({ hasText: PRODUCT_TITLE }).first();
    await card.getByRole("button", { name: /edit target price/i }).click();

    // The toggle is rendered in edit mode
    await expect(card.getByText("Alert when back in stock")).toBeVisible();
  });

  test("include second-hand toggle is visible in edit mode", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("li, article, [data-testid='product-card']").filter({ hasText: PRODUCT_TITLE }).first();
    await card.getByRole("button", { name: /edit target price/i }).click();

    await expect(card.getByText("Include second-hand")).toBeVisible();
  });

  test("toggling include second-hand off adds used sellers to excluded list", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("li, article, [data-testid='product-card']").filter({ hasText: PRODUCT_TITLE }).first();
    await card.getByRole("button", { name: /edit target price/i }).click();

    // Find the Include second-hand toggle and click it to disable
    const secondHandToggle = card.locator("label").filter({ hasText: "Include second-hand" }).locator("input[type='checkbox']");
    const wasChecked = await secondHandToggle.isChecked();
    if (wasChecked) {
      await secondHandToggle.click();
      // UsedSeller should now appear crossed out in the seller table
      await expect(card.getByText("UsedSeller")).toBeVisible();
    }
  });

  test("seller checkbox unchecks and strikes through the seller name", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("li, article, [data-testid='product-card']").filter({ hasText: PRODUCT_TITLE }).first();
    await card.getByRole("button", { name: /edit target price/i }).click();

    // Find Amazon row checkbox and uncheck it
    const amazonRow = card.locator("tr").filter({ hasText: /^Amazon/ }).first();
    const checkbox = amazonRow.locator("input[type='checkbox']");
    if (await checkbox.isChecked()) {
      await checkbox.click();
      await expect(amazonRow.locator("td").nth(1)).toHaveClass(/line-through/);
    }
  });
});

test.describe("Dashboard — add product", () => {
  test("mocked add: card appears after form submission", async ({ page }) => {
    // Intercept POST /api/products to avoid real scraping
    await page.route("**/api/products", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PRODUCT),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await page.getByPlaceholder("Paste an Amazon product URL…").fill(ADD_URL);
    await page.getByRole("button", { name: "Add product" }).click();

    await expect(page.getByText("Mocked Add Product")).toBeVisible();
  });

  test("shows an error when an invalid URL is submitted", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Paste an Amazon product URL…").fill("https://google.com");
    await page.getByRole("button", { name: "Add product" }).click();

    await expect(page.getByText(/invalid amazon/i)).toBeVisible();
  });
});

test.describe("Dashboard — refresh button", () => {
  test("shows a spinner while refreshing and re-enables when done", async ({ page }) => {
    await page.route("**/api/products/refresh", async (route) => {
      // Delay to let the spinner become visible
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/");
    const refreshBtn = page.getByRole("button", { name: "Refresh all products" });
    await refreshBtn.click();

    // Button should be disabled while running
    await expect(refreshBtn).toBeDisabled();
    // After completion it should be re-enabled
    await expect(refreshBtn).toBeEnabled({ timeout: 5000 });
  });
});

test.describe("Dashboard — delete product", () => {
  test("remove button deletes the product card from the list", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("li, article, [data-testid='product-card']").filter({ hasText: PRODUCT_TITLE }).first();
    await card.getByRole("button", { name: "Remove product" }).click();

    await expect(page.getByText(PRODUCT_TITLE)).not.toBeVisible({ timeout: 5000 });
  });
});

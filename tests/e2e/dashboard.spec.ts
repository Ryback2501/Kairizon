import { test, expect, type Page } from "@playwright/test";

const PRODUCT_TITLE = "E2E Test Product";
const ADD_ASIN = "B00E2EADD1";
const ADD_URL = `https://www.amazon.com/dp/${ADD_ASIN}`;

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

// Cards are <div class="...shadow-card..."> — find by that class + product title
function getCard(page: Page, title: string) {
  return page.locator('[class*="shadow-card"]').filter({ hasText: title }).first();
}

test.describe("Dashboard — product card", () => {
  test("seeded product is visible on the dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(PRODUCT_TITLE)).toBeVisible();
  });

  test("edit button reveals the target price input", async ({ page }) => {
    await page.goto("/");
    const card = getCard(page, PRODUCT_TITLE);
    await card.getByRole("button", { name: /set target price|edit target price/i }).click();
    await expect(card.getByPlaceholder("0.00")).toBeVisible();
  });

  test("saving a target price shows the alert info line", async ({ page }) => {
    await page.goto("/");
    const card = getCard(page, PRODUCT_TITLE);
    await card.getByRole("button", { name: /set target price|edit target price/i }).click();

    await card.getByPlaceholder("0.00").fill("35");
    await card.getByRole("button", { name: "Save target price" }).click();

    await expect(card.getByText(/alert below/i)).toBeVisible();
  });

  test("stock alert toggle is visible in edit mode", async ({ page }) => {
    await page.goto("/");
    const card = getCard(page, PRODUCT_TITLE);
    await card.getByRole("button", { name: /edit target price/i }).click();

    await expect(card.getByText("Alert when back in stock")).toBeVisible();
  });

  test("include second-hand toggle is visible in edit mode", async ({ page }) => {
    await page.goto("/");
    const card = getCard(page, PRODUCT_TITLE);
    await card.getByRole("button", { name: /edit target price/i }).click();

    await expect(card.getByText("Include second-hand")).toBeVisible();
  });

  test("toggling include second-hand off adds used sellers to excluded list", async ({ page }) => {
    await page.goto("/");
    const card = getCard(page, PRODUCT_TITLE);
    await card.getByRole("button", { name: /edit target price/i }).click();

    // Toggle component renders <button role="switch" aria-checked="...">
    const secondHandSwitch = card.locator("label").filter({ hasText: "Include second-hand" }).getByRole("switch");
    const wasChecked = (await secondHandSwitch.getAttribute("aria-checked")) === "true";
    if (wasChecked) {
      await secondHandSwitch.click();
      await expect(card.getByText("UsedSeller")).toBeVisible();
    }
  });

  test("seller checkbox unchecks and strikes through the seller name", async ({ page }) => {
    await page.goto("/");
    const card = getCard(page, PRODUCT_TITLE);
    await card.getByRole("button", { name: /edit target price/i }).click();

    const amazonRow = card.locator("tr").filter({ hasText: /^Amazon/ }).first();
    const checkbox = amazonRow.locator("input[type='checkbox']");
    if (await checkbox.isChecked()) {
      await checkbox.click();
      await expect(amazonRow.locator("td").nth(1)).toHaveClass(/line-through/);
    }
  });
});

test.describe("Dashboard — add product", () => {
  test("form clears after successful submission (scraper mocked)", async ({ page }) => {
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
    const input = page.getByPlaceholder("Paste an Amazon product URL…");
    await input.fill(ADD_URL);
    await page.getByRole("button", { name: "Add product" }).click();

    // Input clears on success
    await expect(input).toHaveValue("", { timeout: 5000 });
  });

  test("shows an error when an invalid URL is submitted", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Paste an Amazon product URL…").fill("https://google.com");
    await page.getByRole("button", { name: "Add product" }).click();

    await expect(page.getByText(/invalid amazon/i)).toBeVisible();
  });
});

test.describe("Dashboard — refresh menu option", () => {
  test("the Refresh menu item triggers a refresh request", async ({ page }) => {
    let refreshed = false;
    await page.route("**/api/products/refresh", async (route) => {
      refreshed = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("menuitem", { name: /refresh/i }).click();

    await expect.poll(() => refreshed).toBe(true);
    // Menu closes after the action.
    await expect(page.getByRole("menuitem", { name: /refresh/i })).toHaveCount(0);
  });
});

test.describe("Dashboard — delete product", () => {
  test("remove button deletes the product card from the list", async ({ page }) => {
    await page.goto("/");
    const card = getCard(page, PRODUCT_TITLE);
    await card.getByRole("button", { name: "Remove product" }).click();

    await expect(page.getByText(PRODUCT_TITLE)).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe("Header menu", () => {
  test("an amazon.com product shows a camelcamelcamel link", async ({ page }) => {
    // Serve a known amazon.com product so this test is independent of the
    // shared seeded row (which other tests delete).
    await page.route("**/api/products", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([MOCK_PRODUCT]),
      });
    });

    await page.goto("/");
    const card = getCard(page, MOCK_PRODUCT.title);
    const camel = card.getByRole("link", { name: "Check price history at camelcamelcamel.com" });
    await expect(camel).toHaveAttribute(
      "href",
      `https://www.camelcamelcamel.com/product/${ADD_ASIN}`,
    );
  });

  test("theme toggle switches and persists across reloads", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");

    // Default light.
    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("menuitem", { name: "Dark theme" }).click();
    await expect(html).toHaveClass(/dark/);

    // Persisted via the database — survives a reload.
    await page.reload();
    await expect(html).toHaveClass(/dark/);

    // Restore light so the shared DB state does not leak to other runs.
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("menuitem", { name: "Light theme" }).click();
    await expect(html).not.toHaveClass(/dark/);
  });
});

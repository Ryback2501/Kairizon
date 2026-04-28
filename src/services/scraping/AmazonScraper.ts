import { chromium } from "playwright-core";
import { extractAsin, buildScrapeUrl } from "@/lib/amazon";
import { deduplicateSellers } from "@/lib/pricing";
import type { IScraper } from "./IScraper";
import type { ScrapeResult, Seller } from "@/types";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(): Promise<void> {
  return delay(2000 + Math.random() * 3000);
}

const SECOND_HAND_PATTERNS =
  /used|refurbished|collectible|renewed|like new|very good|good|acceptable|usado|reacondicionado|como nuevo|muy bueno|bueno|aceptable/i;

const OUT_OF_STOCK_PATTERNS = [
  /currently unavailable/i,
  /out of stock/i,
  /unavailable/i,
  /this item cannot be shipped/i,
  /no disponible/i,
  /agotado/i,
];

export class AmazonScraper implements IScraper {
  async scrape(url: string): Promise<ScrapeResult | null> {
    const scrapeUrl = buildScrapeUrl(url);
    const asin = extractAsin(url);
    if (!asin) {
      console.warn("[AmazonScraper] Could not extract ASIN from:", url);
      return null;
    }

    let browser;
    try {
      const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
      browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        ...(executablePath ? { executablePath } : {}),
      });
    } catch (err) {
      console.error("[AmazonScraper] Failed to launch browser:", err);
      return null;
    }
    try {
      const locale = process.env.SCRAPER_LOCALE ?? "es-ES";
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        locale,
        extraHTTPHeaders: {
          "Accept-Language": `${locale},${locale.split("-")[0]};q=0.9,en;q=0.8`,
        },
      });

      const page = await context.newPage();

      try {
        // networkidle waits for JavaScript to render the AOD panel and price widgets
        await page.goto(scrapeUrl, { waitUntil: "networkidle", timeout: 45_000 });
      } catch (err) {
        console.warn("[AmazonScraper] Navigation failed:", (err as Error).message);
        return null;
      }

      // Detect CAPTCHA
      const bodyText = await page.locator("body").textContent({ timeout: 5_000 }).catch(() => "");
      if (bodyText?.includes("captchacharacters") || bodyText?.includes("Type the characters")) {
        console.warn("[AmazonScraper] CAPTCHA detected for:", scrapeUrl);
        return null;
      }

      // Extract title
      const title = await page
        .locator("#productTitle, #aod-asin-title-text, h1")
        .first()
        .textContent({ timeout: 5_000 })
        .catch(() => "")
        .then((t) => t?.trim() ?? "");

      if (!title) {
        console.warn("[AmazonScraper] Could not extract title for ASIN:", asin);
        return null;
      }

      // Extract image
      const image = await page
        .locator("#landingImage, #imgBlkFront, img#main-image, #aod-asin-image-id")
        .first()
        .getAttribute("src")
        .catch(() => null);

      // Extract availability
      const availabilityText = await page
        .locator("#availability")
        .textContent({ timeout: 3_000 })
        .catch(() => "");
      const availabilityLower = (availabilityText ?? "").trim().toLowerCase();

      // Extract sellers from the AOD panel (already rendered by networkidle)
      let sellers: Seller[] = [];
      const aodPanelPresent = await page
        .locator("#aod-offer-list, #aod-pinned-offer")
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (aodPanelPresent) {
        // Shim __name so compiled page.evaluate callbacks work across all bundlers
        await page.evaluate("window.__name = window.__name || function(f) { return f; }");
        const rawSellers = await extractSellers(page);
        sellers = deduplicateSellers(rawSellers);
      }

      // Buy Box fallback
      if (sellers.length === 0) {
        console.warn("[AmazonScraper] AOD panel not found for ASIN:", asin, "— using Buy Box fallback");
        const buyBoxPrice = await extractBuyBoxPrice(page);
        if (buyBoxPrice !== null) {
          sellers = [{ name: "Featured Seller", price: buyBoxPrice, shipping: 0, isSecondHand: false }];
        }
      }

      const inStock =
        availabilityLower === ""
          ? sellers.length > 0
          : !OUT_OF_STOCK_PATTERNS.some((p) => p.test(availabilityLower));

      console.info(
        `[AmazonScraper] ASIN ${asin}: "${title}", ${sellers.length} seller(s), inStock=${inStock}`
      );

      return { asin, title, image: image ?? null, inStock, sellers };
    } finally {
      await browser.close();
    }
  }
}

type PlaywrightPage = Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newContext"]>>["newPage"] extends () => Promise<infer P> ? P : never;

async function extractSellers(page: PlaywrightPage): Promise<Seller[]> {
  return page.evaluate((secondHandPattern: string) => {
    const re = new RegExp(secondHandPattern, "i");
    const sellers: Array<{ name: string; price: number; shipping: number; isSecondHand: boolean }> = [];

    const parsePrice = (text: string): number | null => {
      const raw = text.replace(/[^0-9.,]/g, "");
      if (!raw) return null;
      const lastComma = raw.lastIndexOf(",");
      const lastDot = raw.lastIndexOf(".");
      const normalized =
        lastComma > lastDot
          ? raw.replace(/\./g, "").replace(",", ".")
          : raw.replace(/,/g, "");
      const v = parseFloat(normalized);
      return isNaN(v) ? null : v;
    };

    const extractFromOffer = (el: Element) => {
      // Price — Amazon AOD uses apex price widget with this accessibility label
      const priceEl =
        el.querySelector("span.aok-offscreen.apex-pricetopay-accessibility-label") ??
        el.querySelector(".a-price .a-offscreen");
      const price = parsePrice(priceEl?.textContent ?? "");
      if (price === null) return;

      // Shipping — check for a dedicated shipping section; default to free
      const shippingSection = el.querySelector(
        "[id*='price-shipping'], .aod-offer-price-shipping, [id*='shipping-message']"
      );
      const shippingRaw = (shippingSection?.textContent ?? "").toLowerCase();
      const shipping =
        !shippingSection ||
        shippingRaw.includes("free") ||
        shippingRaw.includes("gratis") ||
        shippingRaw.includes("envío gratis") ||
        shippingRaw.trim() === ""
          ? 0
          : (parsePrice(shippingRaw) ?? 0);

      // Seller name — third-party sellers have a profile link; first-party sellers
      // (e.g. Amazon itself) use a plain span with no anchor.
      const soldByEl =
        el.querySelector(
          "#sellerProfileTriggerId, [id='aod-offer-soldBy'] a, [id*='soldBy'] a, [id*='sold-by'] a"
        ) ??
        el.querySelector(
          "[id='aod-offer-soldBy'] span.a-color-base, [id*='soldBy'] span.a-color-base"
        );
      const name = soldByEl?.textContent?.trim() ?? "";
      if (!name) return;

      // Condition — from the offer heading (avoid broad h5 which also matches the product title)
      const conditionEl = el.querySelector(
        "#aod-offer-heading span, [id*='offer-heading'] span"
      );
      const isSecondHand = re.test(conditionEl?.textContent ?? "");

      sellers.push({ name, price, shipping, isSecondHand });
    };

    // Pinned offer (Buy Box winner shown at top of AOD panel)
    const pinned = document.querySelector("#aod-pinned-offer");
    if (pinned) extractFromOffer(pinned);

    // All other offers — Amazon reuses id="aod-offer" for every offer block
    document.querySelectorAll("[id='aod-offer']").forEach((el) => extractFromOffer(el));

    return sellers;
  }, SECOND_HAND_PATTERNS.source);
}

async function extractBuyBoxPrice(page: PlaywrightPage): Promise<number | null> {
  const priceText = await page
    .locator(
      "span.aok-offscreen.apex-pricetopay-accessibility-label, .priceToPay .a-offscreen, .a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice"
    )
    .first()
    .textContent({ timeout: 3_000 })
    .catch(() => "");

  const raw = (priceText ?? "").replace(/[^0-9.,]/g, "");
  if (!raw) return null;

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  const normalized =
    lastComma > lastDot
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "");

  const v = parseFloat(normalized);
  return isNaN(v) ? null : v;
}

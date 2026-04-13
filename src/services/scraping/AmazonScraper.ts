import axios from "axios";
import * as cheerio from "cheerio";
import { extractAsin, buildScrapeUrl } from "@/lib/amazon";
import type { IScraper } from "./IScraper";
import type { ScrapeResult, Seller } from "@/types";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(): Promise<void> {
  return delay(2000 + Math.random() * 3000);
}

function buildHeaders() {
  return {
    "User-Agent": randomUserAgent(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "max-age=0",
  };
}

const OUT_OF_STOCK_PATTERNS = [
  /currently unavailable/i,
  /out of stock/i,
  /unavailable/i,
  /this item cannot be shipped/i,
];

const SECOND_HAND_PATTERNS = /used|refurbished|collectible|renewed|like new|very good|good|acceptable|usado|reacondicionado/i;

export class AmazonScraper implements IScraper {
  async scrape(url: string): Promise<ScrapeResult | null> {
    // Use the AOD URL so product info and all seller offers come in one request
    const scrapeUrl = buildScrapeUrl(url);
    let html: string;

    try {
      const response = await axios.get(scrapeUrl, {
        headers: buildHeaders(),
        timeout: 15_000,
        maxRedirects: 5,
      });
      html = response.data as string;
    } catch (err) {
      console.warn("[AmazonScraper] Request failed:", (err as Error).message);
      return null;
    }

    if (html.includes("captchacharacters") || html.includes("api-services-support")) {
      console.warn("[AmazonScraper] CAPTCHA detected for:", scrapeUrl);
      return null;
    }

    const $ = cheerio.load(html);

    const asin = extractAsin(url) ?? $('input[name="ASIN"]').val() as string | undefined;
    if (!asin) {
      console.warn("[AmazonScraper] Could not extract ASIN from:", url);
      return null;
    }

    const title =
      $("#productTitle").text().trim() ||
      $("#title").text().trim() ||
      $('h1[class*="title"]').first().text().trim() ||
      "";

    if (!title) {
      console.warn("[AmazonScraper] Could not extract title for ASIN:", asin);
      return null;
    }

    const image =
      $("#landingImage").attr("src") ||
      $("#imgBlkFront").attr("src") ||
      $('img[data-old-hires]').first().attr("data-old-hires") ||
      $('img#main-image').attr("src") ||
      null;

    // Parse all sellers from the AOD section
    const sellers = parseAodSellers($);

    // Availability — use the standard #availability element when present;
    // fall back to whether any sellers were found
    const availabilityText = $("#availability").text().trim().toLowerCase();
    const inStock =
      availabilityText === ""
        ? sellers.length > 0
        : !OUT_OF_STOCK_PATTERNS.some((p) => p.test(availabilityText));

    // If AOD section was empty (e.g. blocked), fall back to the Buy Box price
    // so the product still gets a usable price on first scrape
    if (sellers.length === 0) {
      const priceText =
        $(".priceToPay .a-offscreen").first().text().trim() ||
        $(".a-price .a-offscreen").first().text().trim() ||
        $("#priceblock_ourprice").text().trim() ||
        $("#priceblock_dealprice").text().trim() ||
        "";
      const fallbackPrice = parsePrice(priceText);
      if (fallbackPrice !== null) {
        sellers.push({ name: "Featured Seller", price: fallbackPrice, shipping: 0, isSecondHand: false });
      }
    }

    return { asin, title, image: image ?? null, inStock, sellers };
  }
}

/**
 * Parses the AOD (All Offers Display) section of a product page loaded
 * with ?aod=1. Each offer block has a numeric ID: aod-offer-1, aod-offer-2, …
 */
function parseAodSellers($: ReturnType<typeof cheerio.load>): Seller[] {
  const sellers: Seller[] = [];

  // AOD renders individual offer divs with IDs like "aod-offer-1", "aod-offer-2", …
  $("[id^='aod-offer-']").each((_, el) => {
    // Skip the container itself (#aod-offer-list) and pinned offer wrapper
    const id = $(el).attr("id") ?? "";
    if (!id.match(/^aod-offer-\d+$/)) return;

    // Price — first .a-offscreen within an .a-price inside this offer
    const priceText = $(el).find(".a-price .a-offscreen").first().text().trim();
    const price = parsePrice(priceText);
    if (price === null) return;

    // Shipping — look for a nested price inside the shipping row; free if text says so
    const shippingEl = $(el).find("[id*='shipping']");
    const shippingText = shippingEl.find(".a-offscreen").first().text().trim();
    const shippingRaw = shippingEl.text().toLowerCase();
    const shipping =
      shippingRaw.includes("free") || shippingRaw.includes("gratis") || shippingRaw.includes("envío gratis")
        ? 0
        : (parsePrice(shippingText) ?? 0);

    // Seller name — the profile trigger link, or any link in the soldBy section
    const soldByEl = $(el).find("[id*='soldBy'], [id*='sold-by'], .aod-offer-soldBy");
    const name =
      soldByEl.find("a").first().text().trim() ||
      soldByEl.text().trim() ||
      "Unknown Seller";

    // Condition — heading or condition element within the offer
    const conditionText =
      $(el).find("[id*='condition'], .aod-offer-heading").first().text().trim();
    const isSecondHand = SECOND_HAND_PATTERNS.test(conditionText);

    if (name) sellers.push({ name: name.trim(), price, shipping, isSecondHand });
  });

  return sellers;
}

function parsePrice(text: string): number | null {
  const raw = text.replace(/[^0-9.,]/g, "");
  if (!raw) return null;

  let normalized: string;
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");

  if (lastComma > lastDot) {
    // European format: 1.234,56 or 49,99 — comma is decimal separator
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else {
    // US format: 1,234.56 or 49.99 — dot is decimal separator
    normalized = raw.replace(/,/g, "");
  }

  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
}

import axios from "axios";
import * as cheerio from "cheerio";
import { extractAsin } from "@/lib/amazon";
import type { IScraper } from "./IScraper";
import type { ScrapeResult } from "@/types";

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

export class AmazonScraper implements IScraper {
  async scrape(url: string, includeSecondHand = false): Promise<ScrapeResult | null> {
    let html: string;

    try {
      const response = await axios.get(url, {
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
      console.warn("[AmazonScraper] CAPTCHA detected for:", url);
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

    const priceText =
      $(".priceToPay .a-offscreen").first().text().trim() ||
      $(".a-price .a-offscreen").first().text().trim() ||
      $("#priceblock_ourprice").text().trim() ||
      $("#priceblock_dealprice").text().trim() ||
      $(".a-price-whole").first().text().trim() ||
      "";

    const newPrice = parsePrice(priceText);

    let currentPrice = newPrice;
    if (includeSecondHand) {
      const usedPriceText =
        $("#usedBuySection .a-price .a-offscreen").first().text().trim() ||
        $(".a-button-text.a-color-price").first().text().trim() ||
        $('span[id*="used-price"]').first().text().trim() ||
        "";
      const usedPrice = parsePrice(usedPriceText);
      if (usedPrice !== null && (newPrice === null || usedPrice < newPrice)) {
        currentPrice = usedPrice;
      }
    }

    const availabilityText = $("#availability").text().trim().toLowerCase();
    const inStock =
      availabilityText === ""
        ? currentPrice !== null
        : !OUT_OF_STOCK_PATTERNS.some((p) => p.test(availabilityText));

    return { asin, title, image: image ?? null, currentPrice, inStock };
  }
}

function parsePrice(text: string): number | null {
  // Strip everything except digits, commas, and dots
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

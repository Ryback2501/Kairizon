import axios from "axios";
import * as cheerio from "cheerio";
import { extractAsin } from "@/lib/amazon";
import type { IScraper } from "./IScraper";
import type { ScrapeResult } from "@/types";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

const OUT_OF_STOCK_PATTERNS = [
  /currently unavailable/i,
  /out of stock/i,
  /unavailable/i,
  /this item cannot be shipped/i,
];

export class AmazonScraper implements IScraper {
  async scrape(url: string): Promise<ScrapeResult | null> {
    let html: string;

    try {
      const response = await axios.get(url, {
        headers: HEADERS,
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

    const currentPrice = parsePrice(priceText);

    const availabilityText = $("#availability").text().trim().toLowerCase();
    const inStock =
      availabilityText === ""
        ? currentPrice !== null
        : !OUT_OF_STOCK_PATTERNS.some((p) => p.test(availabilityText));

    return { asin, title, image: image ?? null, currentPrice, inStock };
  }
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,]/g, "").replace(",", "");
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

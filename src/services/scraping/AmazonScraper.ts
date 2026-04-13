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
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
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
  /no disponible/i,
  /agotado/i,
];

const SECOND_HAND_PATTERNS =
  /used|refurbished|collectible|renewed|like new|very good|good|acceptable|usado|reacondicionado|como nuevo|muy bueno|bueno|aceptable/i;

function isCaptcha(html: string): boolean {
  return html.includes("captchacharacters") || html.includes("api-services-support");
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const { data } = await axios.get<string>(url, {
      headers: buildHeaders(),
      timeout: 15_000,
      maxRedirects: 5,
    });
    if (isCaptcha(data)) {
      console.warn("[AmazonScraper] CAPTCHA at:", url);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("[AmazonScraper] Request failed for", url, "—", (err as Error).message);
    return null;
  }
}

export class AmazonScraper implements IScraper {
  async scrape(url: string): Promise<ScrapeResult | null> {
    // The AOD URL (?aod=1&th=1) is used for the product page request as instructed.
    // It reliably returns title, image and availability server-side.
    const scrapeUrl = buildScrapeUrl(url);
    const html = await fetchHtml(scrapeUrl);
    if (!html) return null;

    const $ = cheerio.load(html);

    const asin = extractAsin(url) ?? ($('input[name="ASIN"]').val() as string | undefined);
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

    // Buy Box price — used as fallback seller if the offer listing is unavailable
    const buyBoxPriceText =
      $(".priceToPay .a-offscreen").first().text().trim() ||
      $(".a-price .a-offscreen").first().text().trim() ||
      $("#priceblock_ourprice").text().trim() ||
      $("#priceblock_dealprice").text().trim() ||
      "";
    const buyBoxPrice = parsePrice(buyBoxPriceText);

    const availabilityText = $("#availability").text().trim().toLowerCase();
    const inStock =
      availabilityText === ""
        ? buyBoxPrice !== null
        : !OUT_OF_STOCK_PATTERNS.some((p) => p.test(availabilityText));

    // The AOD offer list is JavaScript-rendered and not present in the initial HTML.
    // We fetch the offer listing page separately — it is fully server-side rendered.
    const origin = (() => { try { return new URL(url).origin; } catch { return "https://www.amazon.es"; } })();
    const sellers = await fetchOfferListingSellers(origin, asin, buyBoxPrice);

    return { asin, title, image: image ?? null, inStock, sellers };
  }
}

/**
 * Fetches /gp/offer-listing/{ASIN} and parses all sellers from it.
 * This page is server-side rendered and reliably contains the full seller list.
 * Falls back to a single "Featured Seller" entry from the Buy Box price if blocked.
 */
async function fetchOfferListingSellers(
  origin: string,
  asin: string,
  buyBoxPrice: number | null
): Promise<Seller[]> {
  const offersUrl = `${origin}/gp/offer-listing/${asin}`;
  const html = await fetchHtml(offersUrl);
  if (!html) return makeFallbackSellers(buyBoxPrice);

  const $ = cheerio.load(html);
  const sellers: Seller[] = [];

  $(".olpOffer").each((_, el) => {
    const priceText =
      $(el).find(".olpOfferPrice").text().trim() ||
      $(el).find(".a-price .a-offscreen").first().text().trim();
    const price = parsePrice(priceText);
    if (price === null) return;

    const shippingInfo = $(el).find(".olpShippingInfo").text().toLowerCase();
    const shippingText = $(el).find(".olpShippingPrice").text().trim();
    const shipping =
      shippingInfo.includes("free") ||
      shippingInfo.includes("gratis") ||
      shippingInfo.includes("envío gratis")
        ? 0
        : (parsePrice(shippingText) ?? 0);

    const sellerAnchor = $(el).find(".olpSellerName a");
    const name =
      sellerAnchor.text().trim() ||
      $(el).find(".olpSellerName").text().trim() ||
      "Unknown Seller";

    const conditionText = $(el).find(".olpCondition").text().trim();
    const isSecondHand = SECOND_HAND_PATTERNS.test(conditionText);

    sellers.push({ name: name.trim(), price, shipping, isSecondHand });
  });

  if (sellers.length > 0) {
    console.info(`[AmazonScraper] Found ${sellers.length} seller(s) for ASIN ${asin}`);
    return sellers;
  }

  console.warn("[AmazonScraper] No sellers parsed from offer listing for ASIN:", asin);
  return makeFallbackSellers(buyBoxPrice);
}

function makeFallbackSellers(buyBoxPrice: number | null): Seller[] {
  if (buyBoxPrice === null) return [];
  return [{ name: "Featured Seller", price: buyBoxPrice, shipping: 0, isSecondHand: false }];
}

function parsePrice(text: string): number | null {
  const raw = text.replace(/[^0-9.,]/g, "");
  if (!raw) return null;

  let normalized: string;
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");

  if (lastComma > lastDot) {
    // European format: 1.234,56 or 49,99
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else {
    // US format: 1,234.56 or 49.99
    normalized = raw.replace(/,/g, "");
  }

  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
}

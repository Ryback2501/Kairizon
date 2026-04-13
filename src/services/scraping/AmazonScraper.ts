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

function buildPageHeaders() {
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

function buildAjaxHeaders(referer: string) {
  return {
    "User-Agent": randomUserAgent(),
    "Accept": "text/html,*/*",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Referer": referer,
    "X-Requested-With": "XMLHttpRequest",
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

async function fetchHtml(url: string, headers: Record<string, string>): Promise<string | null> {
  try {
    const { data } = await axios.get<string>(url, {
      headers,
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
    // The AOD URL (?aod=1&th=1) is used as instructed for the product page request.
    // It reliably returns title, image, and availability server-side.
    const scrapeUrl = buildScrapeUrl(url);
    const html = await fetchHtml(scrapeUrl, buildPageHeaders());
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

    // Buy Box price — used as last-resort fallback seller
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

    // The AOD side panel is loaded by the browser via a dedicated AJAX endpoint.
    // We call it directly — it returns server-rendered HTML with all sellers.
    const origin = (() => {
      try { return new URL(url).origin; } catch { return "https://www.amazon.es"; }
    })();
    const sellers = await fetchAodSellers(origin, asin, scrapeUrl, buyBoxPrice);

    return { asin, title, image: image ?? null, inStock, sellers };
  }
}

/**
 * Calls the AOD AJAX endpoint that the browser uses to populate the "All Sellers"
 * side panel. Returns server-rendered HTML with individual offer blocks.
 *
 * URL: /gp/aod/ajax?asin={ASIN}&pc=dp&isonlyrenderofferlist=false&pageno=1&pagesize=15
 * The Referer header must be set to the product page URL or Amazon rejects the request.
 */
async function fetchAodSellers(
  origin: string,
  asin: string,
  referer: string,
  buyBoxPrice: number | null
): Promise<Seller[]> {
  const aodUrl =
    `${origin}/gp/aod/ajax` +
    `?asin=${asin}` +
    `&pc=dp` +
    `&isonlyrenderofferlist=false` +
    `&pageno=1` +
    `&pagesize=15` +
    `&ref=dp_aod_all_offers` +
    `&filters=eyJpc0J1eUJveCI6ZmFsc2V9`; // base64({"isBuyBox":false}) — fetch all, not just buy box

  const html = await fetchHtml(aodUrl, buildAjaxHeaders(referer));
  if (!html) return makeFallbackSellers(buyBoxPrice);

  const $ = cheerio.load(html);
  const sellers: Seller[] = [];

  // The AOD response contains:
  //   #aod-pinned-offer  — the Buy Box / featured offer (pinned at top)
  //   #aod-offer-{N}     — all other sellers (numerically suffixed divs)
  const offerSelectors = ["#aod-pinned-offer", "[id^='aod-offer-']"];

  for (const sel of offerSelectors) {
    $(sel).each((_, el) => {
      const id = $(el).attr("id") ?? "";

      // Skip the list container itself (#aod-offer-list)
      if (id === "aod-offer-list") return;
      // Only process the pinned offer or numerically-suffixed offers
      if (id !== "aod-pinned-offer" && !id.match(/^aod-offer-\d+$/)) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const seller = extractOfferData($, el as any);
      if (seller) sellers.push(seller);
    });
  }

  if (sellers.length > 0) {
    console.info(`[AmazonScraper] AOD returned ${sellers.length} seller(s) for ASIN ${asin}`);
    return sellers;
  }

  console.warn("[AmazonScraper] No sellers in AOD response for ASIN:", asin, "— using Buy Box fallback");
  return makeFallbackSellers(buyBoxPrice);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractOfferData($: ReturnType<typeof cheerio.load>, el: any): Seller | null {
  const offerEl = $(el);

  // Price: first .a-offscreen within an .a-price in this offer block
  const priceText = offerEl.find(".a-price .a-offscreen").first().text().trim();
  const price = parsePrice(priceText);
  if (price === null) return null;

  // Shipping: look for a shipping sub-element; text signals free shipping
  const shippingEl = offerEl.find("[id*='shipping'], .aod-offer-price-shipping, [class*='shipping']").first();
  const shippingRaw = shippingEl.text().toLowerCase();
  const shippingText = shippingEl.find(".a-offscreen").first().text().trim();
  const shipping =
    shippingRaw.includes("free") ||
    shippingRaw.includes("gratis") ||
    shippingRaw.includes("envío gratis") ||
    shippingRaw.includes("free delivery")
      ? 0
      : (parsePrice(shippingText) ?? 0);

  // Seller name: profile trigger link or soldBy section
  const soldByEl = offerEl.find(
    "#sellerProfileTriggerId, [id*='soldBy'], [id*='sold-by'], .aod-offer-soldBy, [id*='merchant']"
  );
  const name =
    soldByEl.find("a").first().text().trim() ||
    soldByEl.text().trim() ||
    offerEl.find("a[href*='/gp/help/seller'], a[href*='/shops/']").first().text().trim() ||
    "";

  if (!name) return null;

  // Condition: heading element or any element mentioning condition
  const conditionText = offerEl
    .find("[id*='condition'], [id*='heading'], .aod-offer-heading, h5")
    .first()
    .text()
    .trim();
  const isSecondHand = SECOND_HAND_PATTERNS.test(conditionText);

  return { name: name.trim(), price, shipping, isSecondHand };
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

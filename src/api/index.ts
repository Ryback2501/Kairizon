import { Hono } from "hono";
import { ProductRepository } from "@/repositories/ProductRepository";
import { AppSettingsRepository } from "@/repositories/AppSettingsRepository";
import { AmazonScraper } from "@/services/scraping/AmazonScraper";
import { EmailNotificationService } from "@/services/notification/EmailNotificationService";
import { isValidAmazonUrl, extractAsin, isAmazonSeller } from "@/lib/amazon";
import { computePrice } from "@/lib/pricing";
import { deduplicateSellers } from "@/lib/pricing";
import { runUpdate } from "@/lib/price-check-runner";
import { isRateLimited, allow } from "@/lib/rate-limit";
import { cronStatus } from "@/lib/cron-status";
import type { AppSettingsData } from "@/repositories/IAppSettingsRepository";
import type { Seller } from "@/types";
import packageJson from "../../package.json";

const api = new Hono();

const productRepo = new ProductRepository();
const settingsRepo = new AppSettingsRepository();
const scraper = new AmazonScraper();
const notifier = new EmailNotificationService(settingsRepo);

async function parseBody<T>(req: Request): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const data = (await req.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}

// ── GET /api/products ────────────────────────────────────────────────────────
api.get("/products", async (c) => {
  try {
    const products = await productRepo.findAll();
    return c.json(products);
  } catch (err) {
    console.error("[GET /api/products] Failed:", err);
    return c.json({ error: "Failed to fetch products" }, 500);
  }
});

// ── POST /api/products ───────────────────────────────────────────────────────
api.post("/products", async (c) => {
  const parsed = await parseBody<{ url?: unknown }>(c.req.raw);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const url = typeof parsed.data.url === "string" ? parsed.data.url.trim() : "";
  if (!isValidAmazonUrl(url)) return c.json({ error: "Invalid Amazon product URL" }, 400);

  const asin = extractAsin(url);
  if (!asin) return c.json({ error: "Invalid Amazon product URL" }, 400);

  try {
    const existing = await productRepo.findByAsin(asin);
    if (existing) return c.json({ error: "Product already tracked" }, 409);
  } catch (err) {
    console.error("[POST /api/products] DB lookup failed:", err);
    return c.json({ error: "Internal server error" }, 500);
  }

  let result;
  try {
    result = await scraper.scrape(url);
  } catch (err) {
    console.error("[POST /api/products] Scraper threw:", err);
    return c.json({ error: "Could not fetch product data. Amazon may be blocking the request." }, 422);
  }

  if (!result) return c.json({ error: "Could not fetch product data. Amazon may be blocking the request." }, 422);

  try {
    const excludedSellers: string[] = [];
    const currentPrice = computePrice(result.sellers, true, excludedSellers);
    const inStock = result.sellers.some((s) => isAmazonSeller(s.name));
    const product = await productRepo.create({
      asin: result.asin,
      title: result.title,
      image: result.image,
      url,
      currentPrice,
      inStock,
      sellers: result.sellers,
      excludedSellers,
      includeSecondHand: true,
    });
    return c.json(product, 201);
  } catch (err) {
    console.error("[POST /api/products] Failed to create product:", err);
    return c.json({ error: "Failed to save product" }, 500);
  }
});

// ── DELETE /api/products/:id ─────────────────────────────────────────────────
api.delete("/products/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const product = await productRepo.findById(id);
    if (!product) return c.json({ error: "Not found" }, 404);
    await productRepo.delete(id);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error(`[DELETE /api/products/${id}] Failed:`, err);
    return c.json({ error: "Failed to delete product" }, 500);
  }
});

// ── PATCH /api/products/:id/target ───────────────────────────────────────────
api.patch("/products/:id/target", async (c) => {
  const id = c.req.param("id");
  const product = await productRepo.findById(id);
  if (!product) return c.json({ error: "Not found" }, 404);

  const parsed = await parseBody<{ targetPrice?: unknown }>(c.req.raw);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const { targetPrice: rawTargetPrice } = parsed.data;
  const targetPrice =
    rawTargetPrice === null ? null
    : typeof rawTargetPrice === "number" && rawTargetPrice > 0 ? rawTargetPrice
    : undefined;

  if (targetPrice === undefined) return c.json({ error: "targetPrice must be a positive number or null" }, 400);

  try {
    const updated = await productRepo.updateTargetPrice(id, targetPrice);
    return c.json(updated);
  } catch (err) {
    console.error(`[PATCH /api/products/${id}/target] Failed:`, err);
    return c.json({ error: "Failed to update target price" }, 500);
  }
});

// ── PATCH /api/products/:id/stock-alert ─────────────────────────────────────
api.patch("/products/:id/stock-alert", async (c) => {
  const id = c.req.param("id");
  const product = await productRepo.findById(id);
  if (!product) return c.json({ error: "Not found" }, 404);

  const parsed = await parseBody<{ trackStock?: unknown }>(c.req.raw);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  if (typeof parsed.data.trackStock !== "boolean") return c.json({ error: "trackStock must be a boolean" }, 400);

  try {
    const updated = await productRepo.updateTrackStock(id, parsed.data.trackStock);
    return c.json(updated);
  } catch (err) {
    console.error(`[PATCH /api/products/${id}/stock-alert] Failed:`, err);
    return c.json({ error: "Failed to update stock alert" }, 500);
  }
});

// ── PATCH /api/products/:id/second-hand ─────────────────────────────────────
api.patch("/products/:id/second-hand", async (c) => {
  const id = c.req.param("id");
  const product = await productRepo.findById(id);
  if (!product) return c.json({ error: "Not found" }, 404);

  const parsed = await parseBody<{ includeSecondHand?: unknown }>(c.req.raw);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  if (typeof parsed.data.includeSecondHand !== "boolean") return c.json({ error: "includeSecondHand must be a boolean" }, 400);

  try {
    const updated = await productRepo.updateIncludeSecondHand(id, parsed.data.includeSecondHand);

    let sellers: Seller[];
    let currentExcluded: string[];
    try {
      sellers = JSON.parse(updated.availableSellers);
      currentExcluded = JSON.parse(product.excludedSellers);
    } catch {
      return c.json({ error: "Corrupted seller data" }, 500);
    }

    const secondHandNames = sellers.filter((s) => s.isSecondHand).map((s) => s.name);
    let newExcluded: string[];
    if (!parsed.data.includeSecondHand) {
      newExcluded = Array.from(new Set([...currentExcluded, ...secondHandNames]));
    } else {
      const toRemove = new Set(secondHandNames);
      newExcluded = currentExcluded.filter((n) => !toRemove.has(n));
    }

    const withExcluded = await productRepo.updateExcludedSellers(id, newExcluded);
    let excluded: string[];
    try {
      excluded = JSON.parse(withExcluded.excludedSellers) as string[];
    } catch {
      return c.json({ error: "Corrupted seller data" }, 500);
    }
    const currentPrice = computePrice(sellers, withExcluded.includeSecondHand, excluded);
    const final = await productRepo.updateCurrentPrice(id, currentPrice);
    return c.json(final);
  } catch (err) {
    console.error(`[PATCH /api/products/${id}/second-hand] Failed:`, err);
    return c.json({ error: "Failed to update second-hand setting" }, 500);
  }
});

// ── PATCH /api/products/:id/excluded-sellers ─────────────────────────────────
api.patch("/products/:id/excluded-sellers", async (c) => {
  const id = c.req.param("id");
  const product = await productRepo.findById(id);
  if (!product) return c.json({ error: "Not found" }, 404);

  const parsed = await parseBody<{ excludedSellers?: unknown }>(c.req.raw);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  if (!Array.isArray(parsed.data.excludedSellers) || !parsed.data.excludedSellers.every((s) => typeof s === "string")) {
    return c.json({ error: "excludedSellers must be a string array" }, 400);
  }

  try {
    const updated = await productRepo.updateExcludedSellers(id, parsed.data.excludedSellers as string[]);

    let sellers: Seller[];
    let excluded: string[];
    try {
      sellers = JSON.parse(updated.availableSellers) as Seller[];
      excluded = JSON.parse(updated.excludedSellers) as string[];
    } catch {
      return c.json({ error: "Corrupted seller data" }, 500);
    }

    const currentPrice = computePrice(sellers, updated.includeSecondHand, excluded);
    const final = await productRepo.updateCurrentPrice(id, currentPrice);
    return c.json(final);
  } catch (err) {
    console.error(`[PATCH /api/products/${id}/excluded-sellers] Failed:`, err);
    return c.json({ error: "Failed to update excluded sellers" }, 500);
  }
});

// ── PATCH /api/products/:id/notified ────────────────────────────────────────
api.patch("/products/:id/notified", async (c) => {
  const id = c.req.param("id");
  const product = await productRepo.findById(id);
  if (!product) return c.json({ error: "Product not found" }, 404);

  const parsed = await parseBody<{ notified?: unknown }>(c.req.raw);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  if (typeof parsed.data.notified !== "boolean") return c.json({ error: "notified must be a boolean" }, 400);

  try {
    await productRepo.setNotified(id, parsed.data.notified);
    const updated = await productRepo.findById(id);
    if (!updated) return c.json({ error: "Product not found" }, 404);
    return c.json(updated);
  } catch (err) {
    console.error(`[PATCH /api/products/${id}/notified] Failed:`, err);
    return c.json({ error: "Failed to update notified flag" }, 500);
  }
});

// ── POST /api/products/refresh ───────────────────────────────────────────────
api.post("/products/refresh", async (c) => {
  if (isRateLimited("refresh", 60_000)) return c.json({ error: "Too many requests. Wait a minute before refreshing again." }, 429);
  allow("refresh");
  try {
    await runUpdate();
  } catch (err) {
    console.error("[refresh] Price check failed:", err);
    return c.json({ error: "Price check failed" }, 500);
  }
  return c.json({ ok: true });
});

// ── GET /api/settings ────────────────────────────────────────────────────────
const SMTPPASS_MASK = "••••••••";

function maskSettings(settings: AppSettingsData): AppSettingsData {
  return { ...settings, smtpPass: settings.smtpPass ? SMTPPASS_MASK : "" };
}

api.get("/settings", async (c) => {
  try {
    const settings = await settingsRepo.get();
    return c.json(maskSettings(settings));
  } catch (err) {
    console.error("[GET /api/settings] Failed:", err);
    return c.json({ error: "Failed to load settings" }, 500);
  }
});

api.put("/settings", async (c) => {
  const parsed = await parseBody<Partial<AppSettingsData>>(c.req.raw);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const body = parsed.data;

  if (typeof body.smtpPort === "number" && (body.smtpPort < 1 || body.smtpPort > 65535)) {
    return c.json({ error: "smtpPort must be between 1 and 65535" }, 400);
  }

  try {
    const current = await settingsRepo.get();
    const updated = await settingsRepo.save({
      smtpHost: typeof body.smtpHost === "string" ? body.smtpHost : current.smtpHost,
      smtpPort: typeof body.smtpPort === "number" ? body.smtpPort : current.smtpPort,
      smtpUser: typeof body.smtpUser === "string" ? body.smtpUser : current.smtpUser,
      smtpPass: typeof body.smtpPass === "string" && body.smtpPass !== SMTPPASS_MASK ? body.smtpPass : current.smtpPass,
      smtpFrom: typeof body.smtpFrom === "string" ? body.smtpFrom : current.smtpFrom,
    });
    return c.json(maskSettings(updated));
  } catch (err) {
    console.error("[PUT /api/settings] Failed:", err);
    return c.json({ error: "Failed to save settings" }, 500);
  }
});

// ── GET /api/status ──────────────────────────────────────────────────────────
api.get("/status", (c) => {
  return c.json({ version: packageJson.version, cron: cronStatus });
});

// ── POST /api/test-notifications ─────────────────────────────────────────────
api.post("/test-notifications", async (c) => {
  if (isRateLimited("test-notifications", 60_000)) {
    return c.json({ error: "Too many requests. Wait a minute before testing again." }, 429);
  }
  allow("test-notifications");

  let products;
  try {
    products = await productRepo.findAll();
  } catch (err) {
    console.error("[test-notifications] Failed to fetch products:", err);
    return c.json({ error: "Failed to fetch products" }, 500);
  }

  if (products.length === 0) return c.json({ error: "No products to test with" }, 400);

  const product = products[Math.floor(Math.random() * products.length)];
  const currentPrice = product.currentPrice ?? 49.99;
  const targetPrice = product.targetPrice ?? currentPrice * 0.9;

  const results = await Promise.allSettled([
    notifier.sendPriceAlert({ productTitle: product.title, productUrl: product.url, currentPrice, targetPrice }),
    notifier.sendStockAlert({ productTitle: product.title, productUrl: product.url }),
  ]);

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    const reasons = failed.map((r) => (r as PromiseRejectedResult).reason as unknown);
    console.error("[test-notifications] One or more notifications failed:", reasons);
    return c.json({ error: "One or more notifications failed to send" }, 500);
  }

  return c.json({ product: product.title });
});

export default api;

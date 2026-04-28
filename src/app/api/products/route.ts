import { NextRequest, NextResponse } from "next/server";
import { ProductRepository } from "@/repositories/ProductRepository";
import { AmazonScraper } from "@/services/scraping/AmazonScraper";
import { isValidAmazonUrl, extractAsin, isAmazonSeller } from "@/lib/amazon";
import { computePrice } from "@/lib/pricing";
import { parseBody } from "@/lib/api";

const repo = new ProductRepository();
const scraper = new AmazonScraper();

export async function GET() {
  try {
    const products = await repo.findAll();
    return NextResponse.json(products);
  } catch (err) {
    console.error("[GET /api/products] Failed to fetch products:", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody<{ url?: unknown }>(req);
  if (!parsed.ok) return parsed.res;
  const url = typeof parsed.data.url === "string" ? parsed.data.url.trim() : "";

  if (!isValidAmazonUrl(url)) {
    return NextResponse.json({ error: "Invalid Amazon product URL" }, { status: 400 });
  }

  const asin = extractAsin(url);
  if (!asin) return NextResponse.json({ error: "Invalid Amazon product URL" }, { status: 400 });

  try {
    const existing = await repo.findByAsin(asin);
    if (existing) {
      return NextResponse.json({ error: "Product already tracked" }, { status: 409 });
    }
  } catch (err) {
    console.error("[POST /api/products] DB lookup failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  let result;
  try {
    result = await scraper.scrape(url);
  } catch (err) {
    console.error("[POST /api/products] Scraper threw:", err);
    return NextResponse.json({ error: "Could not fetch product data. Amazon may be blocking the request." }, { status: 422 });
  }

  if (!result) {
    return NextResponse.json({ error: "Could not fetch product data. Amazon may be blocking the request." }, { status: 422 });
  }

  try {
    const excludedSellers: string[] = [];
    const currentPrice = computePrice(result.sellers, true, excludedSellers);
    const inStock = result.sellers.some((s) => isAmazonSeller(s.name));
    const product = await repo.create({ asin: result.asin, title: result.title, image: result.image, url, currentPrice, inStock, sellers: result.sellers, excludedSellers, includeSecondHand: true });
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error("[POST /api/products] Failed to create product:", err);
    return NextResponse.json({ error: "Failed to save product" }, { status: 500 });
  }
}

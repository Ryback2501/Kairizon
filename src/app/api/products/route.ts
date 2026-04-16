import { NextRequest, NextResponse } from "next/server";
import { ProductRepository } from "@/repositories/ProductRepository";
import { AmazonScraper } from "@/services/scraping/AmazonScraper";
import { isValidAmazonUrl, extractAsin, isAmazonSeller } from "@/lib/amazon";
import { computePrice } from "@/lib/pricing";

const repo = new ProductRepository();
const scraper = new AmazonScraper();

export async function GET() {
  const products = await repo.findAll();
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { url?: unknown };
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!isValidAmazonUrl(url)) {
    return NextResponse.json({ error: "Invalid Amazon product URL" }, { status: 400 });
  }

  const asin = extractAsin(url)!;
  const existing = await repo.findByAsin(asin);
  if (existing) {
    return NextResponse.json({ error: "Product already tracked" }, { status: 409 });
  }

  const result = await scraper.scrape(url);
  if (!result) {
    return NextResponse.json({ error: "Could not fetch product data. Amazon may be blocking the request." }, { status: 422 });
  }

  // All sellers selected by default; includeSecondHand enabled by default
  const excludedSellers: string[] = [];
  const currentPrice = computePrice(result.sellers, true, excludedSellers);
  // inStock tracks Amazon's availability specifically
  const inStock = result.sellers.some((s) => isAmazonSeller(s.name));
  const product = await repo.create({ asin: result.asin, title: result.title, image: result.image, url, currentPrice, inStock, sellers: result.sellers, excludedSellers, includeSecondHand: true });
  return NextResponse.json(product, { status: 201 });
}

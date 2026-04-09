import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ProductRepository } from "@/repositories/ProductRepository";
import { AmazonScraper } from "@/services/scraping/AmazonScraper";
import { isValidAmazonUrl, extractAsin } from "@/lib/amazon";

const repo = new ProductRepository();
const scraper = new AmazonScraper();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await repo.findByUserId(session.user.id);
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { url?: unknown };
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!isValidAmazonUrl(url)) {
    return NextResponse.json({ error: "Invalid Amazon product URL" }, { status: 400 });
  }

  const asin = extractAsin(url)!;

  const existing = await repo.findByUserAndAsin(session.user.id, asin);
  if (existing) {
    return NextResponse.json({ error: "Product already tracked" }, { status: 409 });
  }

  const result = await scraper.scrape(url);
  if (!result) {
    return NextResponse.json(
      { error: "Could not fetch product data. Amazon may be blocking the request." },
      { status: 422 }
    );
  }

  const product = await repo.create({
    userId: session.user.id,
    asin: result.asin,
    title: result.title,
    image: result.image,
    url,
    currentPrice: result.currentPrice,
    inStock: result.inStock,
  });

  return NextResponse.json(product, { status: 201 });
}

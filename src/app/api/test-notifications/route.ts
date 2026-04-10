import { NextResponse } from "next/server";
import { ProductRepository } from "@/repositories/ProductRepository";
import { EmailNotificationService } from "@/services/notification/EmailNotificationService";

const repo = new ProductRepository();
const notifier = new EmailNotificationService();

export async function POST() {
  const products = await repo.findAll();

  if (products.length === 0) {
    return NextResponse.json({ error: "No products to test with" }, { status: 400 });
  }

  const product = products[Math.floor(Math.random() * products.length)];
  const currentPrice = product.currentPrice ?? 49.99;
  const targetPrice = product.targetPrice ?? currentPrice * 0.9;

  await Promise.all([
    notifier.sendPriceAlert({
      productTitle: product.title,
      productUrl: product.url,
      currentPrice,
      targetPrice,
    }),
    notifier.sendStockAlert({
      productTitle: product.title,
      productUrl: product.url,
    }),
  ]);

  return NextResponse.json({ product: product.title });
}

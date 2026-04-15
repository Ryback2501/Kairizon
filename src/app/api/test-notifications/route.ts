import { NextResponse } from "next/server";
import { ProductRepository } from "@/repositories/ProductRepository";
import { EmailNotificationService } from "@/services/notification/EmailNotificationService";
import { AppSettingsRepository } from "@/repositories/AppSettingsRepository";
import { isRateLimited, allow } from "@/lib/rate-limit";

const repo = new ProductRepository();
const notifier = new EmailNotificationService(new AppSettingsRepository());

const COOLDOWN_MS = 60_000; // 1 minute

export async function POST() {
  if (isRateLimited("test-notifications", COOLDOWN_MS)) {
    return NextResponse.json({ error: "Too many requests. Wait a minute before testing again." }, { status: 429 });
  }
  allow("test-notifications");

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

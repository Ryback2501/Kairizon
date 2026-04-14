import { ProductRepository } from "@/repositories/ProductRepository";
import { AppSettingsRepository } from "@/repositories/AppSettingsRepository";
import { AmazonScraper } from "@/services/scraping/AmazonScraper";
import { EmailNotificationService } from "@/services/notification/EmailNotificationService";
import { PriceCheckService } from "@/services/price-check/PriceCheckService";

const service = new PriceCheckService(
  new ProductRepository(),
  new AmazonScraper(),
  new EmailNotificationService(new AppSettingsRepository())
);

let lastFullUpdate: Date | null = null;

export function shouldSkip(): boolean {
  return lastFullUpdate !== null && Date.now() - lastFullUpdate.getTime() < 5 * 60 * 1000;
}

export async function runUpdate(): Promise<void> {
  await service.runPriceCheck();
  lastFullUpdate = new Date();
}

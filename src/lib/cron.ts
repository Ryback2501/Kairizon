import type cron from "node-cron";
import { ProductRepository } from "@/repositories/ProductRepository";
import { AmazonScraper } from "@/services/scraping/AmazonScraper";
import { EmailNotificationService } from "@/services/notification/EmailNotificationService";
import { PriceCheckService } from "@/services/price-check/PriceCheckService";

export function startPriceCheckCron(_cron: typeof cron): void {
  const service = new PriceCheckService(
    new ProductRepository(),
    new AmazonScraper(),
    new EmailNotificationService()
  );

  _cron.schedule("*/30 * * * *", () => {
    service.runPriceCheck().catch((err: unknown) => {
      console.error("[cron] Price check failed:", err);
    });
  });

  console.log("[cron] Price check scheduled — every 30 minutes");
}

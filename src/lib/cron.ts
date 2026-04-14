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

  let lastFullUpdate: Date | null = null;

  // Startup run — always executes regardless of last update time
  service.runPriceCheck()
    .then(() => { lastFullUpdate = new Date(); })
    .catch((err: unknown) => { console.error("[cron] Startup price check failed:", err); });

  // Scheduled run — every hour on the hour and on the half hour
  _cron.schedule("0,30 * * * *", () => {
    if (lastFullUpdate && Date.now() - lastFullUpdate.getTime() < 5 * 60 * 1000) {
      console.log("[cron] Skipping scheduled run — last update was less than 5 minutes ago");
      return;
    }
    service.runPriceCheck()
      .then(() => { lastFullUpdate = new Date(); })
      .catch((err: unknown) => { console.error("[cron] Price check failed:", err); });
  });

  console.log("[cron] Price check scheduled — on startup, then every :00 and :30");
}

import { ProductRepository } from "@/repositories/ProductRepository";
import { AppSettingsRepository } from "@/repositories/AppSettingsRepository";
import { AmazonScraper } from "@/services/scraping/AmazonScraper";
import { EmailNotificationService } from "@/services/notification/EmailNotificationService";
import { PriceCheckService } from "@/services/price-check/PriceCheckService";
import { cronStatus } from "@/lib/cron-status";

const service = new PriceCheckService(
  new ProductRepository(),
  new AmazonScraper(),
  new EmailNotificationService(new AppSettingsRepository())
);

let lastFullUpdate: Date | null = null;
let isRunning = false;

export function shouldSkip(): boolean {
  return lastFullUpdate !== null && Date.now() - lastFullUpdate.getTime() < 5 * 60 * 1000;
}

export async function runUpdate(): Promise<void> {
  if (isRunning) {
    console.log("[price-check-runner] Skipping: a run is already in progress");
    return;
  }
  isRunning = true;
  cronStatus.currentlyRunning = true;
  const start = Date.now();
  try {
    await service.runPriceCheck();
    lastFullUpdate = new Date();
    cronStatus.lastRunAt = lastFullUpdate.toISOString();
    cronStatus.lastRunDurationMs = Date.now() - start;
    cronStatus.lastRunSuccess = true;
  } catch (err) {
    cronStatus.lastRunAt = new Date().toISOString();
    cronStatus.lastRunDurationMs = Date.now() - start;
    cronStatus.lastRunSuccess = false;
    throw err;
  } finally {
    isRunning = false;
    cronStatus.currentlyRunning = false;
  }
}

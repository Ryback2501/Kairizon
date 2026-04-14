import type cron from "node-cron";
import { runUpdate, shouldSkip } from "@/lib/price-check-runner";

export function startPriceCheckCron(_cron: typeof cron): void {
  // Startup run — always executes regardless of last update time
  runUpdate().catch((err: unknown) => { console.error("[cron] Startup price check failed:", err); });

  // Scheduled run — every hour on the hour and on the half hour
  _cron.schedule("0,30 * * * *", () => {
    if (shouldSkip()) {
      console.log("[cron] Skipping scheduled run — last update was less than 5 minutes ago");
      return;
    }
    runUpdate().catch((err: unknown) => { console.error("[cron] Price check failed:", err); });
  });

  console.log("[cron] Price check scheduled — on startup, then every :00 and :30");
}

import type cron from "node-cron";

// Stub — real implementation added in feat/services-layer
export function startPriceCheckCron(_cron: typeof cron): void {
  _cron.schedule("*/30 * * * *", () => {
    // Price check logic wired in feat/services-layer
  });
}

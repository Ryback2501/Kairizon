import type { IProductRepository } from "@/repositories/IProductRepository";
import type { IScraper } from "@/services/scraping/IScraper";
import type { INotificationService } from "@/services/notification/INotificationService";
import type { IPriceCheckService } from "./IPriceCheckService";
import type { Product } from "@prisma/client";
import { randomDelay } from "@/services/scraping/AmazonScraper";

export class PriceCheckService implements IPriceCheckService {
  constructor(
    private readonly repo: IProductRepository,
    private readonly scraper: IScraper,
    private readonly notifier: INotificationService
  ) {}

  async runPriceCheck(): Promise<void> {
    const products = await this.repo.findAllWithTargets();
    for (const product of products) {
      await this.checkProduct(product).catch((err: unknown) => {
        console.error(`[PriceCheckService] Failed to check product ${product.id}:`, err);
      });
      if (products.length > 1) await randomDelay();
    }
  }

  private async checkProduct(product: Product): Promise<void> {
    const result = await this.scraper.scrape(product.url, product.includeSecondHand);
    if (!result) return;

    await this.repo.updatePriceAndStock(product.id, result.currentPrice, result.inStock);

    // Back in stock
    if (result.inStock && !product.inStock && product.trackStock && !product.stockNotified) {
      await this.notifier.sendStockAlert({ productTitle: product.title, productUrl: product.url });
      await this.repo.setStockNotified(product.id, true, true);
      return;
    }

    // Went out of stock — reset for future re-alert
    if (!result.inStock && product.inStock) {
      await this.repo.setStockNotified(product.id, false, false);
      return;
    }

    // Cycle complete — reset stockNotified
    if (result.inStock && product.inStock && product.stockNotified) {
      await this.repo.setStockNotified(product.id, false, true);
    }

    // Price alert
    if (result.inStock && result.currentPrice !== null && product.targetPrice !== null && result.currentPrice <= product.targetPrice && !product.notified) {
      await this.notifier.sendPriceAlert({ productTitle: product.title, productUrl: product.url, currentPrice: result.currentPrice, targetPrice: product.targetPrice });
      await this.repo.setNotified(product.id, true);
      return;
    }

    // Reset notified when price rises back above target
    if (product.notified && (result.currentPrice === null || product.targetPrice === null || result.currentPrice > product.targetPrice)) {
      await this.repo.setNotified(product.id, false);
    }
  }
}

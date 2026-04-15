import type { IProductRepository } from "@/repositories/IProductRepository";
import type { IScraper } from "@/services/scraping/IScraper";
import type { INotificationService } from "@/services/notification/INotificationService";
import type { IPriceCheckService } from "./IPriceCheckService";
import type { Product } from "@prisma/client";
import { randomDelay } from "@/services/scraping/AmazonScraper";
import { computePrice } from "@/lib/pricing";

export class PriceCheckService implements IPriceCheckService {
  constructor(
    private readonly repo: IProductRepository,
    private readonly scraper: IScraper,
    private readonly notifier: INotificationService
  ) {}

  async runPriceCheck(): Promise<void> {
    const products = await this.repo.findAll();
    for (const product of products) {
      await this.checkProduct(product).catch((err: unknown) => {
        console.error(`[PriceCheckService] Failed to check product ${product.id}:`, err);
      });
      if (products.length > 1) await randomDelay();
    }
  }

  private async checkProduct(product: Product): Promise<void> {
    const result = await this.scraper.scrape(product.url);
    if (!result) return;

    let excluded: string[];
    try {
      excluded = JSON.parse(product.excludedSellers);
    } catch {
      console.error(`[PriceCheckService] Failed to parse excludedSellers for product ${product.id}`);
      excluded = [];
    }

    // When second-hand is off, auto-exclude any new second-hand sellers that
    // weren't in the excluded list yet (e.g. appeared after initial scrape).
    if (!product.includeSecondHand) {
      const newSecondHand = result.sellers
        .filter((s) => s.isSecondHand && !excluded.includes(s.name))
        .map((s) => s.name);
      if (newSecondHand.length > 0) {
        excluded = [...excluded, ...newSecondHand];
        await this.repo.updateExcludedSellers(product.id, excluded);
      }
    }

    const currentPrice = computePrice(result.sellers, product.includeSecondHand, excluded);

    // inStock tracks Amazon's availability specifically
    const amazonInStock = result.sellers.some((s) => /^amazon$/i.test(s.name.trim()));

    await this.repo.updatePriceAndStock(product.id, currentPrice, amazonInStock, result.sellers);

    // Back in stock
    if (amazonInStock && !product.inStock && product.trackStock && !product.stockNotified) {
      await this.notifier.sendStockAlert({ productTitle: product.title, productUrl: product.url });
      await this.repo.setStockNotified(product.id, true, true);
      return;
    }

    // Went out of stock — reset for future re-alert
    if (!amazonInStock && product.inStock) {
      await this.repo.setStockNotified(product.id, false, false);
      return;
    }

    // Cycle complete — reset stockNotified
    if (amazonInStock && product.inStock && product.stockNotified) {
      await this.repo.setStockNotified(product.id, false, true);
    }

    // Price alert
    if (amazonInStock && currentPrice !== null && product.targetPrice !== null && currentPrice <= product.targetPrice && !product.notified) {
      await this.notifier.sendPriceAlert({ productTitle: product.title, productUrl: product.url, currentPrice, targetPrice: product.targetPrice });
      await this.repo.setNotified(product.id, true);
      return;
    }

    // Reset notified when price rises back above target
    if (product.notified && (currentPrice === null || product.targetPrice === null || currentPrice > product.targetPrice)) {
      await this.repo.setNotified(product.id, false);
    }
  }
}

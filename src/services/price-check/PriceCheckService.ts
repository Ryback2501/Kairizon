import type { IProductRepository } from "@/repositories/IProductRepository";
import type { IScraper } from "@/services/scraping/IScraper";
import type { INotificationService } from "@/services/notification/INotificationService";
import type { IPriceCheckService } from "./IPriceCheckService";
import type { Product } from "@prisma/client";
import { randomDelay } from "@/services/scraping/AmazonScraper";
import { computePrice } from "@/lib/pricing";
import { isAmazonSeller } from "@/lib/amazon";

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
        .filter((s) => s.isSecondHand && !excluded.some((e) => e.toLowerCase() === s.name.toLowerCase()))
        .map((s) => s.name);
      if (newSecondHand.length > 0) {
        excluded = [...excluded, ...newSecondHand];
        await this.repo.updateExcludedSellers(product.id, excluded);
      }
    }

    const currentPrice = computePrice(result.sellers, product.includeSecondHand, excluded);

    // inStock tracks Amazon's availability specifically
    const amazonInStock = result.sellers.some((s) => isAmazonSeller(s.name));

    await this.repo.updatePriceAndStock(product.id, currentPrice, amazonInStock, result.sellers);

    // Back in stock — send stock alert, then continue to price check
    if (amazonInStock && !product.inStock && product.trackStock && !product.stockNotified) {
      try {
        await this.notifier.sendStockAlert({ productTitle: product.title, productUrl: product.url });
        await this.repo.setStockNotified(product.id, true, true);
      } catch (err) {
        console.error(`[PriceCheckService] Failed to send stock alert for product ${product.id}:`, err);
      }
    }

    // Went out of stock — reset for future re-alert, then continue to price check
    // (non-Amazon selected sellers may still have stock and meet the target price)
    if (!amazonInStock && product.inStock) {
      await this.repo.setStockNotified(product.id, false, false);
    }

    // Cycle complete — reset stockNotified
    if (amazonInStock && product.inStock && product.stockNotified) {
      await this.repo.setStockNotified(product.id, false, true);
    }

    // Price alert — fires if any eligible selected seller has price ≤ target
    if (currentPrice !== null && product.targetPrice !== null && currentPrice <= product.targetPrice && !product.notified) {
      try {
        await this.notifier.sendPriceAlert({ productTitle: product.title, productUrl: product.url, currentPrice, targetPrice: product.targetPrice });
        await this.repo.setNotified(product.id, true);
      } catch (err) {
        console.error(`[PriceCheckService] Failed to send price alert for product ${product.id}:`, err);
      }
      return;
    }

    // Reset notified when price rises back above target
    if (product.notified && (currentPrice === null || product.targetPrice === null || currentPrice > product.targetPrice)) {
      await this.repo.setNotified(product.id, false);
    }
  }
}

import type { IProductRepository } from "@/repositories/IProductRepository";
import type { IScraper } from "@/services/scraping/IScraper";
import type { INotificationService } from "@/services/notification/INotificationService";
import type { IPriceCheckService } from "./IPriceCheckService";

export class PriceCheckService implements IPriceCheckService {
  constructor(
    private readonly repo: IProductRepository,
    private readonly scraper: IScraper,
    private readonly notifier: INotificationService
  ) {}

  async runPriceCheck(): Promise<void> {
    const products = await this.repo.findAllWithTargets();

    await Promise.allSettled(
      products.map((product) => this.checkProduct(product))
    );
  }

  private async checkProduct(
    product: Awaited<ReturnType<IProductRepository["findAllWithTargets"]>>[number]
  ): Promise<void> {
    const result = await this.scraper.scrape(product.url);
    if (!result) return;

    await this.repo.updatePriceAndStock(product.id, result.currentPrice, result.inStock);

    const email = product.user.email;
    if (!email) return;

    // Stock state transition: back in stock
    if (result.inStock && !product.inStock && product.trackStock && !product.stockNotified) {
      await this.notifier.sendStockAlert({
        toEmail: email,
        productTitle: product.title,
        productUrl: product.url,
      });
      await this.repo.setStockNotified(product.id, true, true);
      return;
    }

    // Stock state transition: went out of stock — reset flags for future re-alert
    if (!result.inStock && product.inStock) {
      await this.repo.setStockNotified(product.id, false, false);
      return;
    }

    // Reset stockNotified once product is confirmed back in stock after a full cycle
    if (result.inStock && product.inStock && product.stockNotified) {
      await this.repo.setStockNotified(product.id, false, true);
    }

    // Price alert
    if (
      result.inStock &&
      result.currentPrice !== null &&
      product.targetPrice !== null &&
      result.currentPrice <= product.targetPrice &&
      !product.notified
    ) {
      await this.notifier.sendPriceAlert({
        toEmail: email,
        productTitle: product.title,
        productUrl: product.url,
        currentPrice: result.currentPrice,
        targetPrice: product.targetPrice,
      });
      await this.repo.setNotified(product.id, true);
      return;
    }

    // Reset price notified flag when price rises back above target
    if (
      product.notified &&
      (result.currentPrice === null ||
        product.targetPrice === null ||
        result.currentPrice > product.targetPrice)
    ) {
      await this.repo.setNotified(product.id, false);
    }
  }
}

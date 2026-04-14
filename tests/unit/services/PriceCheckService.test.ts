import type { IScraper } from "@/services/scraping/IScraper";
import type { INotificationService } from "@/services/notification/INotificationService";
import type { IProductRepository } from "@/repositories/IProductRepository";
import { PriceCheckService } from "@/services/price-check/PriceCheckService";
import type { Product } from "@prisma/client";
import type { Seller } from "@/types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    asin: "B00TEST1234",
    title: "Test Product",
    image: null,
    url: "https://www.amazon.com/dp/B00TEST1234",
    currentPrice: 50,
    targetPrice: 40,
    lastChecked: null,
    notified: false,
    inStock: true,
    trackStock: false,
    stockNotified: false,
    includeSecondHand: false,
    availableSellers: "[]",
    excludedSellers: "[]",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeScrapeResult(
  overrides: Partial<{ currentPrice: number | null; inStock: boolean; sellers: Seller[] }> = {}
) {
  const price = overrides.currentPrice ?? 50;
  // Default seller is Amazon — inStock is now derived from Amazon's presence in sellers
  const sellers: Seller[] = overrides.sellers ?? (
    price !== null
      ? [{ name: "Amazon", price, shipping: 0, isSecondHand: false }]
      : []
  );
  return {
    asin: "B00TEST1234",
    title: "Test Product",
    image: null,
    sellers,
    inStock: overrides.inStock ?? true,
  };
}

function makeMocks() {
  const repo: jest.Mocked<IProductRepository> = {
    findAllWithTargets: jest.fn(),
    updatePriceAndStock: jest.fn().mockResolvedValue(undefined),
    setNotified: jest.fn().mockResolvedValue(undefined),
    setStockNotified: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByAsin: jest.fn(),
    create: jest.fn(),
    updateTargetPrice: jest.fn(),
    updateTrackStock: jest.fn(),
    updateIncludeSecondHand: jest.fn(),
    updateExcludedSellers: jest.fn(),
    updateCurrentPrice: jest.fn(),
    delete: jest.fn(),
  };

  const scraper: jest.Mocked<IScraper> = {
    scrape: jest.fn(),
  };

  const notifier: jest.Mocked<INotificationService> = {
    sendPriceAlert: jest.fn().mockResolvedValue(undefined),
    sendStockAlert: jest.fn().mockResolvedValue(undefined),
  };

  return { repo, scraper, notifier };
}

describe("PriceCheckService", () => {
  it("sends a price alert when price drops to or below target", async () => {
    const { repo, scraper, notifier } = makeMocks();
    const product = makeProduct({ currentPrice: 50, targetPrice: 40, notified: false });
    repo.findAll.mockResolvedValue([product]);
    scraper.scrape.mockResolvedValue(makeScrapeResult({ currentPrice: 38, inStock: true }));

    await new PriceCheckService(repo, scraper, notifier).runPriceCheck();

    expect(notifier.sendPriceAlert).toHaveBeenCalledWith(
      expect.objectContaining({ currentPrice: 38, targetPrice: 40 })
    );
    expect(repo.setNotified).toHaveBeenCalledWith("prod-1", true);
  });

  it("does not send price alert if already notified", async () => {
    const { repo, scraper, notifier } = makeMocks();
    const product = makeProduct({ currentPrice: 38, targetPrice: 40, notified: true });
    repo.findAll.mockResolvedValue([product]);
    scraper.scrape.mockResolvedValue(makeScrapeResult({ currentPrice: 35, inStock: true }));

    await new PriceCheckService(repo, scraper, notifier).runPriceCheck();

    expect(notifier.sendPriceAlert).not.toHaveBeenCalled();
  });

  it("resets notified flag when price rises back above target", async () => {
    const { repo, scraper, notifier } = makeMocks();
    const product = makeProduct({ currentPrice: 38, targetPrice: 40, notified: true });
    repo.findAll.mockResolvedValue([product]);
    scraper.scrape.mockResolvedValue(makeScrapeResult({ currentPrice: 55, inStock: true }));

    await new PriceCheckService(repo, scraper, notifier).runPriceCheck();

    expect(repo.setNotified).toHaveBeenCalledWith("prod-1", false);
    expect(notifier.sendPriceAlert).not.toHaveBeenCalled();
  });

  it("sends stock alert when product comes back in stock", async () => {
    const { repo, scraper, notifier } = makeMocks();
    const product = makeProduct({
      inStock: false,
      trackStock: true,
      stockNotified: false,
      targetPrice: null,
    });
    repo.findAll.mockResolvedValue([product]);
    scraper.scrape.mockResolvedValue(makeScrapeResult({ currentPrice: 50, inStock: true }));

    await new PriceCheckService(repo, scraper, notifier).runPriceCheck();

    expect(notifier.sendStockAlert).toHaveBeenCalledWith(
      expect.objectContaining({ productTitle: "Test Product" })
    );
    expect(repo.setStockNotified).toHaveBeenCalledWith("prod-1", true, true);
  });

  it("does not send stock alert when trackStock is false", async () => {
    const { repo, scraper, notifier } = makeMocks();
    const product = makeProduct({
      inStock: false,
      trackStock: false,
      stockNotified: false,
      targetPrice: null,
    });
    repo.findAll.mockResolvedValue([product]);
    scraper.scrape.mockResolvedValue(makeScrapeResult({ currentPrice: 50, inStock: true }));

    await new PriceCheckService(repo, scraper, notifier).runPriceCheck();

    expect(notifier.sendStockAlert).not.toHaveBeenCalled();
  });

  it("resets stockNotified when product goes out of stock again", async () => {
    const { repo, scraper, notifier } = makeMocks();
    const product = makeProduct({
      inStock: true,
      trackStock: true,
      stockNotified: false,
      targetPrice: null,
    });
    repo.findAll.mockResolvedValue([product]);
    // Empty sellers = Amazon is out of stock (no Amazon entry in the list)
    scraper.scrape.mockResolvedValue(makeScrapeResult({ sellers: [] }));

    await new PriceCheckService(repo, scraper, notifier).runPriceCheck();

    expect(repo.setStockNotified).toHaveBeenCalledWith("prod-1", false, false);
    expect(notifier.sendStockAlert).not.toHaveBeenCalled();
  });

  it("skips product when scraper returns null", async () => {
    const { repo, scraper, notifier } = makeMocks();
    repo.findAll.mockResolvedValue([makeProduct()]);
    scraper.scrape.mockResolvedValue(null);

    await new PriceCheckService(repo, scraper, notifier).runPriceCheck();

    expect(repo.updatePriceAndStock).not.toHaveBeenCalled();
    expect(notifier.sendPriceAlert).not.toHaveBeenCalled();
  });

  it("does not alert when price has no target set", async () => {
    const { repo, scraper, notifier } = makeMocks();
    const product = makeProduct({ targetPrice: null });
    repo.findAll.mockResolvedValue([product]);
    scraper.scrape.mockResolvedValue(makeScrapeResult({ currentPrice: 10 }));

    await new PriceCheckService(repo, scraper, notifier).runPriceCheck();

    expect(notifier.sendPriceAlert).not.toHaveBeenCalled();
  });
});

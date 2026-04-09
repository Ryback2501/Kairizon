import type { Product } from "@prisma/client";

export interface IProductRepository {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  findByAsin(asin: string): Promise<Product | null>;
  findAllWithTargets(): Promise<Product[]>;
  create(data: {
    asin: string;
    title: string;
    image: string | null;
    url: string;
    currentPrice: number | null;
    inStock: boolean;
  }): Promise<Product>;
  updateTargetPrice(id: string, targetPrice: number | null): Promise<Product>;
  updateTrackStock(id: string, trackStock: boolean): Promise<Product>;
  updateIncludeSecondHand(id: string, includeSecondHand: boolean): Promise<Product>;
  updatePriceAndStock(id: string, currentPrice: number | null, inStock: boolean): Promise<void>;
  setNotified(id: string, notified: boolean): Promise<void>;
  setStockNotified(id: string, stockNotified: boolean, inStock: boolean): Promise<void>;
  delete(id: string): Promise<void>;
}

import type { Product } from "@prisma/client";
import type { ProductWithUser } from "@/types";

export interface IProductRepository {
  findAllWithTargets(): Promise<ProductWithUser[]>;
  updatePriceAndStock(
    id: string,
    currentPrice: number | null,
    inStock: boolean
  ): Promise<void>;
  setNotified(id: string, notified: boolean): Promise<void>;
  setStockNotified(
    id: string,
    stockNotified: boolean,
    inStock: boolean
  ): Promise<void>;
  findByUserId(userId: string): Promise<Product[]>;
  create(data: {
    userId: string;
    asin: string;
    title: string;
    image: string | null;
    url: string;
    currentPrice: number | null;
    inStock: boolean;
  }): Promise<Product>;
  findByUserAndAsin(userId: string, asin: string): Promise<Product | null>;
  updateTargetPrice(
    id: string,
    targetPrice: number | null
  ): Promise<Product>;
  updateTrackStock(id: string, trackStock: boolean): Promise<Product>;
  delete(id: string): Promise<void>;
}

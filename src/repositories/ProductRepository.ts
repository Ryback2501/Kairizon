import type { Product } from "@prisma/client";
import type { IProductRepository } from "./IProductRepository";
import type { ProductWithUser } from "@/types";
import { db } from "@/lib/db";

export class ProductRepository implements IProductRepository {
  async findAllWithTargets(): Promise<ProductWithUser[]> {
    return db.product.findMany({
      where: { targetPrice: { not: null } },
      include: { user: { select: { email: true, name: true } } },
    });
  }

  async updatePriceAndStock(
    id: string,
    currentPrice: number | null,
    inStock: boolean
  ): Promise<void> {
    await db.product.update({
      where: { id },
      data: { currentPrice, inStock, lastChecked: new Date() },
    });
  }

  async setNotified(id: string, notified: boolean): Promise<void> {
    await db.product.update({ where: { id }, data: { notified } });
  }

  async setStockNotified(
    id: string,
    stockNotified: boolean,
    inStock: boolean
  ): Promise<void> {
    await db.product.update({
      where: { id },
      data: { stockNotified, inStock },
    });
  }

  async findByUserId(userId: string): Promise<Product[]> {
    return db.product.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: {
    userId: string;
    asin: string;
    title: string;
    image: string | null;
    url: string;
    currentPrice: number | null;
    inStock: boolean;
  }): Promise<Product> {
    return db.product.create({ data });
  }

  async findByUserAndAsin(
    userId: string,
    asin: string
  ): Promise<Product | null> {
    return db.product.findUnique({ where: { userId_asin: { userId, asin } } });
  }

  async updateTargetPrice(
    id: string,
    targetPrice: number | null
  ): Promise<Product> {
    return db.product.update({
      where: { id },
      data: { targetPrice, notified: false },
    });
  }

  async updateTrackStock(id: string, trackStock: boolean): Promise<Product> {
    return db.product.update({ where: { id }, data: { trackStock } });
  }

  async delete(id: string): Promise<void> {
    await db.product.delete({ where: { id } });
  }
}

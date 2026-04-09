import type { Product } from "@prisma/client";
import type { IProductRepository } from "./IProductRepository";
import { db } from "@/lib/db";

export class ProductRepository implements IProductRepository {
  async findAll(): Promise<Product[]> {
    return db.product.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string): Promise<Product | null> {
    return db.product.findUnique({ where: { id } });
  }

  async findByAsin(asin: string): Promise<Product | null> {
    return db.product.findUnique({ where: { asin } });
  }

  async findAllWithTargets(): Promise<Product[]> {
    return db.product.findMany({ where: { targetPrice: { not: null } } });
  }

  async create(data: {
    asin: string;
    title: string;
    image: string | null;
    url: string;
    currentPrice: number | null;
    inStock: boolean;
  }): Promise<Product> {
    return db.product.create({ data });
  }

  async updateTargetPrice(id: string, targetPrice: number | null): Promise<Product> {
    return db.product.update({ where: { id }, data: { targetPrice, notified: false } });
  }

  async updateTrackStock(id: string, trackStock: boolean): Promise<Product> {
    return db.product.update({ where: { id }, data: { trackStock } });
  }

  async updatePriceAndStock(id: string, currentPrice: number | null, inStock: boolean): Promise<void> {
    await db.product.update({ where: { id }, data: { currentPrice, inStock, lastChecked: new Date() } });
  }

  async setNotified(id: string, notified: boolean): Promise<void> {
    await db.product.update({ where: { id }, data: { notified } });
  }

  async setStockNotified(id: string, stockNotified: boolean, inStock: boolean): Promise<void> {
    await db.product.update({ where: { id }, data: { stockNotified, inStock } });
  }

  async delete(id: string): Promise<void> {
    await db.product.delete({ where: { id } });
  }
}

import type { Product } from "@/types";
import type { IProductRepository } from "./IProductRepository";
import type { Seller } from "@/types";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

type ProductRow = {
  id: string;
  asin: string;
  title: string;
  image: string | null;
  url: string;
  currentPrice: number | null;
  targetPrice: number | null;
  lastChecked: string | null;
  notified: number;
  inStock: number;
  trackStock: number;
  stockNotified: number;
  includeSecondHand: number;
  availableSellers: string;
  excludedSellers: string;
  createdAt: string;
};

function rowToProduct(row: ProductRow): Product {
  return {
    ...row,
    notified: row.notified === 1,
    inStock: row.inStock === 1,
    trackStock: row.trackStock === 1,
    stockNotified: row.stockNotified === 1,
    includeSecondHand: row.includeSecondHand === 1,
    lastChecked: row.lastChecked ? new Date(row.lastChecked) : null,
    createdAt: new Date(row.createdAt),
  };
}

export class ProductRepository implements IProductRepository {
  async findAll(): Promise<Product[]> {
    const rows = db.prepare(`SELECT * FROM "Product" ORDER BY "createdAt" DESC`).all() as ProductRow[];
    return rows.map(rowToProduct);
  }

  async findById(id: string): Promise<Product | null> {
    const row = db.prepare(`SELECT * FROM "Product" WHERE "id" = ?`).get(id) as ProductRow | undefined;
    return row ? rowToProduct(row) : null;
  }

  async findByAsin(asin: string): Promise<Product | null> {
    const row = db.prepare(`SELECT * FROM "Product" WHERE "asin" = ?`).get(asin) as ProductRow | undefined;
    return row ? rowToProduct(row) : null;
  }

  async create(data: {
    asin: string;
    title: string;
    image: string | null;
    url: string;
    currentPrice: number | null;
    inStock: boolean;
    sellers?: Seller[];
    excludedSellers?: string[];
    includeSecondHand?: boolean;
  }): Promise<Product> {
    const id = randomUUID();
    const { sellers = [], excludedSellers = [], includeSecondHand = true, ...rest } = data;
    db.prepare(`
      INSERT INTO "Product" ("id","asin","title","image","url","currentPrice","inStock","availableSellers","excludedSellers","includeSecondHand")
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(
      id,
      rest.asin,
      rest.title,
      rest.image,
      rest.url,
      rest.currentPrice,
      rest.inStock ? 1 : 0,
      JSON.stringify(sellers),
      JSON.stringify(excludedSellers),
      includeSecondHand ? 1 : 0,
    );
    return (await this.findById(id))!;
  }

  async updateTargetPrice(id: string, targetPrice: number | null): Promise<Product> {
    db.prepare(`UPDATE "Product" SET "targetPrice" = ?, "notified" = 0 WHERE "id" = ?`).run(targetPrice, id);
    return (await this.findById(id))!;
  }

  async updateTrackStock(id: string, trackStock: boolean): Promise<Product> {
    db.prepare(`UPDATE "Product" SET "trackStock" = ? WHERE "id" = ?`).run(trackStock ? 1 : 0, id);
    return (await this.findById(id))!;
  }

  async updateIncludeSecondHand(id: string, includeSecondHand: boolean): Promise<Product> {
    db.prepare(`UPDATE "Product" SET "includeSecondHand" = ? WHERE "id" = ?`).run(includeSecondHand ? 1 : 0, id);
    return (await this.findById(id))!;
  }

  async updatePriceAndStock(id: string, currentPrice: number | null, inStock: boolean, sellers: Seller[]): Promise<void> {
    db.prepare(`
      UPDATE "Product" SET "currentPrice" = ?, "inStock" = ?, "lastChecked" = ?, "availableSellers" = ?
      WHERE "id" = ?
    `).run(currentPrice, inStock ? 1 : 0, new Date().toISOString(), JSON.stringify(sellers), id);
  }

  async updateExcludedSellers(id: string, excludedSellers: string[]): Promise<Product> {
    db.prepare(`UPDATE "Product" SET "excludedSellers" = ? WHERE "id" = ?`).run(JSON.stringify(excludedSellers), id);
    return (await this.findById(id))!;
  }

  async updateCurrentPrice(id: string, currentPrice: number | null): Promise<Product> {
    db.prepare(`UPDATE "Product" SET "currentPrice" = ? WHERE "id" = ?`).run(currentPrice, id);
    return (await this.findById(id))!;
  }

  async setNotified(id: string, notified: boolean): Promise<void> {
    db.prepare(`UPDATE "Product" SET "notified" = ? WHERE "id" = ?`).run(notified ? 1 : 0, id);
  }

  async setStockNotified(id: string, stockNotified: boolean, inStock: boolean): Promise<void> {
    db.prepare(`UPDATE "Product" SET "stockNotified" = ?, "inStock" = ? WHERE "id" = ?`).run(
      stockNotified ? 1 : 0,
      inStock ? 1 : 0,
      id,
    );
  }

  async delete(id: string): Promise<void> {
    db.prepare(`DELETE FROM "Product" WHERE "id" = ?`).run(id);
  }
}

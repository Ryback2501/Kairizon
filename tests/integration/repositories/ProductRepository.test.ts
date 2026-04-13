import { PrismaClient } from "@prisma/client";
import { ProductRepository } from "@/repositories/ProductRepository";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.product.deleteMany({ where: { asin: "B00TESTINT1" } });
  await prisma.$disconnect();
});

describe("ProductRepository", () => {
  const repo = new ProductRepository();
  let productId: string;

  it("creates a product", async () => {
    const product = await repo.create({
      asin: "B00TESTINT1",
      title: "Integration Test Product",
      image: null,
      url: "https://www.amazon.com/dp/B00TESTINT1",
      currentPrice: 49.99,
      inStock: true,
    });

    expect(product.id).toBeDefined();
    expect(product.asin).toBe("B00TESTINT1");
    productId = product.id;
  });

  it("finds all products", async () => {
    const products = await repo.findAll();
    expect(products.length).toBeGreaterThan(0);
    expect(products.some((p) => p.asin === "B00TESTINT1")).toBe(true);
  });

  it("finds product by ASIN", async () => {
    const product = await repo.findByAsin("B00TESTINT1");
    expect(product).not.toBeNull();
    expect(product!.id).toBe(productId);
  });

  it("returns null for non-existent ASIN", async () => {
    const product = await repo.findByAsin("BXXXXXXXX");
    expect(product).toBeNull();
  });

  it("finds product by id", async () => {
    const product = await repo.findById(productId);
    expect(product).not.toBeNull();
    expect(product!.asin).toBe("B00TESTINT1");
  });

  it("updates target price", async () => {
    const updated = await repo.updateTargetPrice(productId, 39.99);
    expect(updated.targetPrice).toBe(39.99);
    expect(updated.notified).toBe(false);
  });

  it("finds products with targets (for cron)", async () => {
    const products = await repo.findAllWithTargets();
    const found = products.find((p) => p.id === productId);
    expect(found).toBeDefined();
    expect(found!.targetPrice).not.toBeNull();
  });

  it("updates price and stock", async () => {
    await repo.updatePriceAndStock(productId, 44.99, true, []);
    const product = await repo.findById(productId);
    expect(product?.currentPrice).toBe(44.99);
    expect(product?.inStock).toBe(true);
    expect(product?.lastChecked).not.toBeNull();
  });

  it("sets notified flag", async () => {
    await repo.setNotified(productId, true);
    const product = await repo.findById(productId);
    expect(product?.notified).toBe(true);
  });

  it("sets stockNotified flag and inStock", async () => {
    await repo.setStockNotified(productId, true, false);
    const product = await repo.findById(productId);
    expect(product?.stockNotified).toBe(true);
    expect(product?.inStock).toBe(false);
  });

  it("updates trackStock", async () => {
    const updated = await repo.updateTrackStock(productId, true);
    expect(updated.trackStock).toBe(true);
  });

  it("deletes a product", async () => {
    await repo.delete(productId);
    const product = await repo.findByAsin("B00TESTINT1");
    expect(product).toBeNull();
  });
});

import { db } from "@/lib/db";
import { ProductRepository } from "@/repositories/ProductRepository";
import api from "@/api/index";

const repo = new ProductRepository();
const TEST_ASIN = "B00INTPID1";
let productId: string;

beforeAll(async () => {
  db.prepare(`DELETE FROM "Product" WHERE "asin" = ?`).run(TEST_ASIN);
  const product = await repo.create({
    asin: TEST_ASIN,
    title: "Products-ID Integration Test",
    image: null,
    url: `https://www.amazon.com/dp/${TEST_ASIN}`,
    currentPrice: 50,
    inStock: true,
    sellers: [
      { name: "Amazon", price: 50, shipping: 0, isSecondHand: false },
      { name: "UsedSeller", price: 30, shipping: 0, isSecondHand: true },
    ],
    excludedSellers: [],
    includeSecondHand: true,
  });
  productId = product.id;
});

afterAll(() => {
  db.prepare(`DELETE FROM "Product" WHERE "asin" = ?`).run(TEST_ASIN);
});

function patch(path: string, body: unknown) {
  return api.request(path, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// --- PATCH /api/products/[id]/target ---

describe("PATCH /api/products/[id]/target", () => {
  it("sets a valid target price and resets notified", async () => {
    const res = await patch(`/products/${productId}/target`, { targetPrice: 40 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.targetPrice).toBe(40);
    expect(body.notified).toBe(false);
  });

  it("clears the target price when null is sent", async () => {
    const res = await patch(`/products/${productId}/target`, { targetPrice: null });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.targetPrice).toBeNull();
  });

  it("returns 400 for an invalid targetPrice", async () => {
    const res = await patch(`/products/${productId}/target`, { targetPrice: "bad" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown product id", async () => {
    const res = await patch("/products/nonexistent-id/target", { targetPrice: 10 });
    expect(res.status).toBe(404);
  });
});

// --- PATCH /api/products/[id]/notified ---

describe("PATCH /api/products/[id]/notified", () => {
  it("sets notified to true", async () => {
    const res = await patch(`/products/${productId}/notified`, { notified: true });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notified).toBe(true);
  });

  it("sets notified to false", async () => {
    const res = await patch(`/products/${productId}/notified`, { notified: false });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notified).toBe(false);
  });

  it("returns 400 for non-boolean notified", async () => {
    const res = await patch(`/products/${productId}/notified`, { notified: "yes" });
    expect(res.status).toBe(400);
  });
});

// --- PATCH /api/products/[id]/stock-alert ---

describe("PATCH /api/products/[id]/stock-alert", () => {
  it("enables stock tracking", async () => {
    const res = await patch(`/products/${productId}/stock-alert`, { trackStock: true });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trackStock).toBe(true);
  });

  it("disables stock tracking", async () => {
    const res = await patch(`/products/${productId}/stock-alert`, { trackStock: false });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trackStock).toBe(false);
  });

  it("returns 400 for non-boolean trackStock", async () => {
    const res = await patch(`/products/${productId}/stock-alert`, { trackStock: 1 });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown product id", async () => {
    const res = await patch("/products/nonexistent-id/stock-alert", { trackStock: true });
    expect(res.status).toBe(404);
  });
});

// --- PATCH /api/products/[id]/second-hand ---

describe("PATCH /api/products/[id]/second-hand", () => {
  it("disabling second-hand adds used sellers to excludedSellers", async () => {
    const res = await patch(`/products/${productId}/second-hand`, { includeSecondHand: false });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.includeSecondHand).toBe(false);
    const excluded: string[] = JSON.parse(body.excludedSellers);
    expect(excluded).toContain("UsedSeller");
  });

  it("re-enabling second-hand removes used sellers from excludedSellers", async () => {
    const res = await patch(`/products/${productId}/second-hand`, { includeSecondHand: true });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.includeSecondHand).toBe(true);
    const excluded: string[] = JSON.parse(body.excludedSellers);
    expect(excluded).not.toContain("UsedSeller");
  });

  it("returns 400 for non-boolean includeSecondHand", async () => {
    const res = await patch(`/products/${productId}/second-hand`, { includeSecondHand: "yes" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown product id", async () => {
    const res = await patch("/products/nonexistent-id/second-hand", { includeSecondHand: true });
    expect(res.status).toBe(404);
  });
});

// --- PATCH /api/products/[id]/excluded-sellers ---

describe("PATCH /api/products/[id]/excluded-sellers", () => {
  it("updates excludedSellers and recalculates currentPrice", async () => {
    const res = await patch(`/products/${productId}/excluded-sellers`, { excludedSellers: ["Amazon"] });
    expect(res.status).toBe(200);
    const body = await res.json();
    const excluded: string[] = JSON.parse(body.excludedSellers);
    expect(excluded).toContain("Amazon");
  });

  it("clears excludedSellers when an empty array is sent", async () => {
    const res = await patch(`/products/${productId}/excluded-sellers`, { excludedSellers: [] });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(JSON.parse(body.excludedSellers)).toEqual([]);
  });

  it("returns 400 when excludedSellers is not a string array", async () => {
    const res = await patch(`/products/${productId}/excluded-sellers`, { excludedSellers: [1, 2] });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown product id", async () => {
    const res = await patch("/products/nonexistent-id/excluded-sellers", { excludedSellers: [] });
    expect(res.status).toBe(404);
  });
});

// --- DELETE /api/products/[id] ---

describe("DELETE /api/products/[id]", () => {
  it("returns 404 for an unknown product id", async () => {
    const res = await api.request("/products/nonexistent-id", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("deletes the product and returns 204", async () => {
    const res = await api.request(`/products/${productId}`, { method: "DELETE" });
    expect(res.status).toBe(204);
    const gone = await repo.findById(productId);
    expect(gone).toBeNull();
  });
});

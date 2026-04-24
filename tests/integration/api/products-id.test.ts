import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ProductRepository } from "@/repositories/ProductRepository";

import { DELETE } from "@/app/api/products/[id]/route";
import { PATCH as patchTarget } from "@/app/api/products/[id]/target/route";
import { PATCH as patchNotified } from "@/app/api/products/[id]/notified/route";
import { PATCH as patchStockAlert } from "@/app/api/products/[id]/stock-alert/route";
import { PATCH as patchSecondHand } from "@/app/api/products/[id]/second-hand/route";
import { PATCH as patchExcludedSellers } from "@/app/api/products/[id]/excluded-sellers/route";

const repo = new ProductRepository();
const TEST_ASIN = "B00INTPID1";
let productId: string;

beforeAll(async () => {
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

afterAll(async () => {
  await db.product.deleteMany({ where: { asin: TEST_ASIN } });
  await db.$disconnect();
});

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/products/test", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// --- PATCH /api/products/[id]/target ---

describe("PATCH /api/products/[id]/target", () => {
  it("sets a valid target price and resets notified", async () => {
    const res = await patchTarget(makeReq({ targetPrice: 40 }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.targetPrice).toBe(40);
    expect(body.notified).toBe(false);
  });

  it("clears the target price when null is sent", async () => {
    const res = await patchTarget(makeReq({ targetPrice: null }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.targetPrice).toBeNull();
  });

  it("returns 400 for an invalid targetPrice", async () => {
    const res = await patchTarget(makeReq({ targetPrice: "bad" }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown product id", async () => {
    const res = await patchTarget(makeReq({ targetPrice: 10 }), {
      params: Promise.resolve({ id: "nonexistent-id" }),
    });
    expect(res.status).toBe(404);
  });
});

// --- PATCH /api/products/[id]/notified ---

describe("PATCH /api/products/[id]/notified", () => {
  it("sets notified to true", async () => {
    const res = await patchNotified(makeReq({ notified: true }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notified).toBe(true);
  });

  it("sets notified to false", async () => {
    const res = await patchNotified(makeReq({ notified: false }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notified).toBe(false);
  });

  it("returns 400 for non-boolean notified", async () => {
    const res = await patchNotified(makeReq({ notified: "yes" }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(400);
  });
});

// --- PATCH /api/products/[id]/stock-alert ---

describe("PATCH /api/products/[id]/stock-alert", () => {
  it("enables stock tracking", async () => {
    const res = await patchStockAlert(makeReq({ trackStock: true }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trackStock).toBe(true);
  });

  it("disables stock tracking", async () => {
    const res = await patchStockAlert(makeReq({ trackStock: false }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trackStock).toBe(false);
  });

  it("returns 400 for non-boolean trackStock", async () => {
    const res = await patchStockAlert(makeReq({ trackStock: 1 }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown product id", async () => {
    const res = await patchStockAlert(makeReq({ trackStock: true }), {
      params: Promise.resolve({ id: "nonexistent-id" }),
    });
    expect(res.status).toBe(404);
  });
});

// --- PATCH /api/products/[id]/second-hand ---

describe("PATCH /api/products/[id]/second-hand", () => {
  it("disabling second-hand adds used sellers to excludedSellers", async () => {
    const res = await patchSecondHand(makeReq({ includeSecondHand: false }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.includeSecondHand).toBe(false);
    const excluded: string[] = JSON.parse(body.excludedSellers);
    expect(excluded).toContain("UsedSeller");
  });

  it("re-enabling second-hand removes used sellers from excludedSellers", async () => {
    const res = await patchSecondHand(makeReq({ includeSecondHand: true }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.includeSecondHand).toBe(true);
    const excluded: string[] = JSON.parse(body.excludedSellers);
    expect(excluded).not.toContain("UsedSeller");
  });

  it("returns 400 for non-boolean includeSecondHand", async () => {
    const res = await patchSecondHand(makeReq({ includeSecondHand: "yes" }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown product id", async () => {
    const res = await patchSecondHand(makeReq({ includeSecondHand: true }), {
      params: Promise.resolve({ id: "nonexistent-id" }),
    });
    expect(res.status).toBe(404);
  });
});

// --- PATCH /api/products/[id]/excluded-sellers ---

describe("PATCH /api/products/[id]/excluded-sellers", () => {
  it("updates excludedSellers and recalculates currentPrice", async () => {
    const res = await patchExcludedSellers(makeReq({ excludedSellers: ["Amazon"] }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const excluded: string[] = JSON.parse(body.excludedSellers);
    expect(excluded).toContain("Amazon");
  });

  it("clears excludedSellers when an empty array is sent", async () => {
    const res = await patchExcludedSellers(makeReq({ excludedSellers: [] }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(JSON.parse(body.excludedSellers)).toEqual([]);
  });

  it("returns 400 when excludedSellers is not a string array", async () => {
    const res = await patchExcludedSellers(makeReq({ excludedSellers: [1, 2] }), {
      params: Promise.resolve({ id: productId }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown product id", async () => {
    const res = await patchExcludedSellers(makeReq({ excludedSellers: [] }), {
      params: Promise.resolve({ id: "nonexistent-id" }),
    });
    expect(res.status).toBe(404);
  });
});

// --- DELETE /api/products/[id] ---

describe("DELETE /api/products/[id]", () => {
  it("returns 404 for an unknown product id", async () => {
    const req = new NextRequest("http://localhost/api/products/bad-id", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nonexistent-id" }) });
    expect(res.status).toBe(404);
  });

  it("deletes the product and returns 204", async () => {
    const req = new NextRequest(`http://localhost/api/products/${productId}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: productId }) });
    expect(res.status).toBe(204);

    const gone = await repo.findById(productId);
    expect(gone).toBeNull();
  });
});

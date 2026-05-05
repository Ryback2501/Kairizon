import { db } from "@/lib/db";
import { ProductRepository } from "@/repositories/ProductRepository";

const mockSendPriceAlert = jest.fn().mockResolvedValue(undefined);
const mockSendStockAlert = jest.fn().mockResolvedValue(undefined);

jest.mock("@/services/notification/EmailNotificationService", () => ({
  EmailNotificationService: jest.fn().mockImplementation(() => ({
    sendPriceAlert: mockSendPriceAlert,
    sendStockAlert: mockSendStockAlert,
  })),
}));

jest.mock("@/lib/rate-limit", () => ({
  isRateLimited: jest.fn().mockReturnValue(false),
  allow: jest.fn(),
}));

import api from "@/api/index";

const repo = new ProductRepository();
const TEST_ASIN = "B00INTTFN1";

beforeAll(async () => {
  db.prepare(`DELETE FROM "Product" WHERE "asin" = ?`).run(TEST_ASIN);
  await repo.create({
    asin: TEST_ASIN,
    title: "Test Notifications Product",
    image: null,
    url: `https://www.amazon.com/dp/${TEST_ASIN}`,
    currentPrice: 49.99,
    inStock: true,
  });
});

afterAll(() => {
  db.prepare(`DELETE FROM "Product" WHERE "asin" = ?`).run(TEST_ASIN);
});

beforeEach(() => {
  mockSendPriceAlert.mockClear();
  mockSendStockAlert.mockClear();
});

describe("POST /api/test-notifications", () => {
  it("returns 200 with a product title in the response", async () => {
    const res = await api.request("/test-notifications", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.product).toBe("string");
    expect(body.product.length).toBeGreaterThan(0);
  });

  it("calls sendPriceAlert exactly once", async () => {
    await api.request("/test-notifications", { method: "POST" });
    expect(mockSendPriceAlert).toHaveBeenCalledTimes(1);
  });

  it("calls sendStockAlert exactly once", async () => {
    await api.request("/test-notifications", { method: "POST" });
    expect(mockSendStockAlert).toHaveBeenCalledTimes(1);
  });

  it("sendPriceAlert receives a positive currentPrice and targetPrice", async () => {
    await api.request("/test-notifications", { method: "POST" });
    const args = mockSendPriceAlert.mock.calls[0][0];
    expect(args.currentPrice).toBeGreaterThan(0);
    expect(args.targetPrice).toBeGreaterThan(0);
    expect(typeof args.productTitle).toBe("string");
    expect(typeof args.productUrl).toBe("string");
  });

  it("sendStockAlert receives a non-empty productTitle and productUrl", async () => {
    await api.request("/test-notifications", { method: "POST" });
    const args = mockSendStockAlert.mock.calls[0][0];
    expect(typeof args.productTitle).toBe("string");
    expect(args.productTitle.length).toBeGreaterThan(0);
    expect(typeof args.productUrl).toBe("string");
    expect(args.productUrl.length).toBeGreaterThan(0);
  });
});

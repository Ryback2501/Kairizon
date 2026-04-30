import { db } from "@/lib/db";

const mockScrape = jest.fn();

jest.mock("@/services/scraping/AmazonScraper", () => ({
  AmazonScraper: jest.fn().mockImplementation(() => ({ scrape: mockScrape })),
}));

// Must be required after jest.mock() so AmazonScraper is already mocked when the
// module-level `new AmazonScraper()` in src/api/index.ts runs.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = (require("@/api/index") as { default: import("hono").Hono }).default;

const TEST_ASIN = "B00INTAPI1";

beforeAll(() => {
  db.prepare(`DELETE FROM "Product" WHERE "asin" = ?`).run(TEST_ASIN);
});

afterAll(() => {
  db.prepare(`DELETE FROM "Product" WHERE "asin" = ?`).run(TEST_ASIN);
});

beforeEach(() => mockScrape.mockReset());

describe("GET /api/products", () => {
  it("returns 200 with a JSON array", async () => {
    const res = await api.request("/products");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("POST /api/products", () => {
  function post(body: unknown) {
    return api.request("/products", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }

  it("returns 400 for an invalid Amazon URL", async () => {
    const res = await post({ url: "https://google.com/dp/B000" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
  });

  it("returns 422 when the scraper returns null", async () => {
    mockScrape.mockResolvedValue(null);
    const res = await post({ url: `https://www.amazon.com/dp/${TEST_ASIN}` });
    expect(res.status).toBe(422);
  });

  it("returns 201 and creates the product when the scraper succeeds", async () => {
    mockScrape.mockResolvedValue({
      asin: TEST_ASIN,
      title: "Integration API Product",
      image: null,
      sellers: [{ name: "Amazon", price: 30, shipping: 0, isSecondHand: false }],
    });
    const res = await post({ url: `https://www.amazon.com/dp/${TEST_ASIN}` });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.asin).toBe(TEST_ASIN);
    expect(body.inStock).toBe(true);
    expect(body.currentPrice).toBe(30);
  });

  it("returns 409 when the product is already tracked", async () => {
    const res = await post({ url: `https://www.amazon.com/dp/${TEST_ASIN}` });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already tracked/i);
  });
});

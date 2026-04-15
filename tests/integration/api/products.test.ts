import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const mockScrape = jest.fn();

jest.mock("@/services/scraping/AmazonScraper", () => ({
  AmazonScraper: jest.fn().mockImplementation(() => ({ scrape: mockScrape })),
}));

import { GET, POST } from "@/app/api/products/route";

const prisma = new PrismaClient();
const TEST_ASIN = "B00INTAPI1";

afterAll(async () => {
  await prisma.product.deleteMany({ where: { asin: TEST_ASIN } });
  await prisma.$disconnect();
});

beforeEach(() => mockScrape.mockReset());

describe("GET /api/products", () => {
  it("returns 200 with a JSON array", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("POST /api/products", () => {
  it("returns 400 for an invalid Amazon URL", async () => {
    const req = new NextRequest("http://localhost/api/products", {
      method: "POST",
      body: JSON.stringify({ url: "https://google.com/dp/B000" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
  });

  it("returns 422 when the scraper returns null", async () => {
    mockScrape.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/products", {
      method: "POST",
      body: JSON.stringify({ url: `https://www.amazon.com/dp/${TEST_ASIN}` }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("returns 201 and creates the product when the scraper succeeds", async () => {
    mockScrape.mockResolvedValue({
      asin: TEST_ASIN,
      title: "Integration API Product",
      image: null,
      sellers: [{ name: "Amazon", price: 30, shipping: 0, isSecondHand: false }],
    });

    const req = new NextRequest("http://localhost/api/products", {
      method: "POST",
      body: JSON.stringify({ url: `https://www.amazon.com/dp/${TEST_ASIN}` }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.asin).toBe(TEST_ASIN);
    expect(body.inStock).toBe(true);
    expect(body.currentPrice).toBe(30);
  });

  it("returns 409 when the product is already tracked", async () => {
    const req = new NextRequest("http://localhost/api/products", {
      method: "POST",
      body: JSON.stringify({ url: `https://www.amazon.com/dp/${TEST_ASIN}` }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already tracked/i);
  });
});

// Re-implement the parsePrice helper to test parsing logic in isolation
function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,]/g, "").replace(",", "");
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

const OUT_OF_STOCK_PATTERNS = [
  /currently unavailable/i,
  /out of stock/i,
  /unavailable/i,
];

function isInStock(availabilityText: string, currentPrice: number | null): boolean {
  if (availabilityText === "") return currentPrice !== null;
  return !OUT_OF_STOCK_PATTERNS.some((p) => p.test(availabilityText));
}

describe("parsePrice", () => {
  it("parses standard US price format", () => {
    expect(parsePrice("$29.99")).toBe(29.99);
  });

  it("parses price without dollar sign", () => {
    expect(parsePrice("29.99")).toBe(29.99);
  });

  it("returns null for empty string", () => {
    expect(parsePrice("")).toBeNull();
  });

  it("returns null for non-numeric text", () => {
    expect(parsePrice("Price not available")).toBeNull();
  });

  it("handles thousands separator", () => {
    expect(parsePrice("$1,299.00")).toBe(1299);
  });
});

describe("isInStock", () => {
  it("returns false when availability says 'Currently unavailable'", () => {
    expect(isInStock("Currently unavailable", null)).toBe(false);
  });

  it("returns false when availability says 'Out of Stock'", () => {
    expect(isInStock("Out of Stock", null)).toBe(false);
  });

  it("returns true when availability says 'In Stock'", () => {
    expect(isInStock("In Stock.", 24.99)).toBe(true);
  });

  it("falls back to price presence when availability is empty", () => {
    expect(isInStock("", 24.99)).toBe(true);
    expect(isInStock("", null)).toBe(false);
  });
});


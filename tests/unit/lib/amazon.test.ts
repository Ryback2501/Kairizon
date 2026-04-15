import { extractAsin, isValidAmazonUrl, buildScrapeUrl } from "@/lib/amazon";

describe("extractAsin", () => {
  it("extracts ASIN from /dp/ URL", () => {
    expect(extractAsin("https://www.amazon.com/dp/B08N5WRWNW")).toBe("B08N5WRWNW");
  });

  it("extracts ASIN from full product URL with query string", () => {
    expect(
      extractAsin(
        "https://www.amazon.com/Some-Product-Title/dp/B09G9FPHY6?ref=sr_1_1"
      )
    ).toBe("B09G9FPHY6");
  });

  it("extracts ASIN from /gp/product/ URL", () => {
    expect(
      extractAsin("https://www.amazon.com/gp/product/B07XJ8C8F5")
    ).toBe("B07XJ8C8F5");
  });

  it("returns null for non-Amazon URL", () => {
    expect(extractAsin("https://www.ebay.com/item/123456")).toBeNull();
  });

  it("returns null for Amazon URL without ASIN", () => {
    expect(extractAsin("https://www.amazon.com/s?k=headphones")).toBeNull();
  });

  it("returns null for invalid URL", () => {
    expect(extractAsin("not-a-url")).toBeNull();
  });

  it("handles amazon.co.uk domain", () => {
    expect(extractAsin("https://www.amazon.co.uk/dp/B08N5WRWNW")).toBe("B08N5WRWNW");
  });
});

describe("isValidAmazonUrl", () => {
  it("returns true for valid Amazon product URL", () => {
    expect(isValidAmazonUrl("https://www.amazon.com/dp/B08N5WRWNW")).toBe(true);
  });

  it("returns false for non-Amazon URL", () => {
    expect(isValidAmazonUrl("https://google.com")).toBe(false);
  });

  it("returns false for Amazon search URL", () => {
    expect(isValidAmazonUrl("https://www.amazon.com/s?k=laptop")).toBe(false);
  });
});

describe("buildScrapeUrl", () => {
  it("builds an AOD URL with aod and th query params", () => {
    expect(buildScrapeUrl("https://www.amazon.com/dp/B08N5WRWNW")).toBe(
      "https://www.amazon.com/dp/B08N5WRWNW?aod=1&th=1"
    );
  });

  it("strips existing query params and replaces with aod params", () => {
    expect(
      buildScrapeUrl("https://www.amazon.com/Some-Title/dp/B08N5WRWNW?ref=sr_1_1&psc=1")
    ).toBe("https://www.amazon.com/dp/B08N5WRWNW?aod=1&th=1");
  });

  it("preserves the original domain (e.g. amazon.co.uk)", () => {
    expect(buildScrapeUrl("https://www.amazon.co.uk/dp/B08N5WRWNW")).toBe(
      "https://www.amazon.co.uk/dp/B08N5WRWNW?aod=1&th=1"
    );
  });

  it("returns the original URL when no ASIN can be extracted", () => {
    const url = "https://www.amazon.com/s?k=headphones";
    expect(buildScrapeUrl(url)).toBe(url);
  });

  it("returns the original input when URL is invalid", () => {
    expect(buildScrapeUrl("not-a-url")).toBe("not-a-url");
  });
});

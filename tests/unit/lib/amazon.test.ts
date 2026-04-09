import { extractAsin, isValidAmazonUrl, buildAmazonUrl } from "@/lib/amazon";

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

describe("buildAmazonUrl", () => {
  it("builds a canonical Amazon product URL", () => {
    expect(buildAmazonUrl("B08N5WRWNW")).toBe(
      "https://www.amazon.com/dp/B08N5WRWNW"
    );
  });

  it("uses a custom domain", () => {
    expect(buildAmazonUrl("B08N5WRWNW", "amazon.co.uk")).toBe(
      "https://www.amazon.co.uk/dp/B08N5WRWNW"
    );
  });
});

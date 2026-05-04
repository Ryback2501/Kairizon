import { extractAsin, isValidAmazonUrl, buildScrapeUrl, getAmazonDomainInfo } from "@/lib/amazon";

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
      "https://www.amazon.com/dp/B08N5WRWNW?aod=1&th=1&language=en_US"
    );
  });

  it("strips existing query params and replaces with aod params", () => {
    expect(
      buildScrapeUrl("https://www.amazon.com/Some-Title/dp/B08N5WRWNW?ref=sr_1_1&psc=1")
    ).toBe("https://www.amazon.com/dp/B08N5WRWNW?aod=1&th=1&language=en_US");
  });

  it("preserves the original domain (e.g. amazon.co.uk)", () => {
    expect(buildScrapeUrl("https://www.amazon.co.uk/dp/B08N5WRWNW")).toBe(
      "https://www.amazon.co.uk/dp/B08N5WRWNW?aod=1&th=1&language=en_US"
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

describe("getAmazonDomainInfo", () => {
  it("returns JPY/ja-JP for amazon.co.jp", () => {
    expect(getAmazonDomainInfo("https://www.amazon.co.jp/dp/B000AAAAAA")).toEqual({ currency: "JPY", locale: "ja-JP", countryCode: "JP" });
  });

  it("returns USD/en-US for amazon.com", () => {
    expect(getAmazonDomainInfo("https://www.amazon.com/dp/B000AAAAAA")).toEqual({ currency: "USD", locale: "en-US", countryCode: "US" });
  });

  it("returns EUR/es-ES for amazon.es", () => {
    expect(getAmazonDomainInfo("https://www.amazon.es/dp/B000AAAAAA")).toEqual({ currency: "EUR", locale: "es-ES", countryCode: "ES" });
  });

  it("returns GBP/en-GB for amazon.co.uk", () => {
    expect(getAmazonDomainInfo("https://www.amazon.co.uk/dp/B000AAAAAA")).toEqual({ currency: "GBP", locale: "en-GB", countryCode: "GB" });
  });

  it("returns EUR/nl-BE for amazon.com.be", () => {
    expect(getAmazonDomainInfo("https://www.amazon.com.be/dp/B000AAAAAA")).toEqual({ currency: "EUR", locale: "nl-BE", countryCode: "BE" });
  });

  it("returns USD/en-US fallback for unknown domain", () => {
    expect(getAmazonDomainInfo("https://www.amazon.xyz/dp/B000AAAAAA")).toEqual({ currency: "USD", locale: "en-US", countryCode: "US" });
  });

  it("returns USD/en-US fallback for invalid URL", () => {
    expect(getAmazonDomainInfo("not-a-url")).toEqual({ currency: "USD", locale: "en-US", countryCode: "US" });
  });
});

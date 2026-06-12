import { extractAsin, isValidAmazonUrl, buildScrapeUrl, getAmazonDomainInfo, buildCamelUrl } from "@/lib/amazon";

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

describe("buildCamelUrl", () => {
  // Marketplaces tracked by camelcamelcamel → expected /product/<ASIN> URL.
  it.each([
    ["https://www.amazon.com/FINAL-FANTASY-Collection/dp/B0DCKFWW1V/", "https://www.camelcamelcamel.com/product/B0DCKFWW1V"],
    ["https://www.amazon.co.uk/Ezilif-90x70x110cm/dp/B0DZC1T8H3?th=1", "https://uk.camelcamelcamel.com/product/B0DZC1T8H3"],
    ["https://www.amazon.de/-/en/DJI-Mini-Fly-More-Combo/dp/B0CQ87N7TS/", "https://de.camelcamelcamel.com/product/B0CQ87N7TS"],
    ["https://www.amazon.fr/Tube-Resistance-Band/dp/B0FNMNDCN4/", "https://fr.camelcamelcamel.com/product/B0FNMNDCN4"],
    ["https://www.amazon.es/-/en/Dodot-Wipes/dp/B09GPJHCQL/", "https://es.camelcamelcamel.com/product/B09GPJHCQL"],
    ["https://www.amazon.it/-/en/Aldo-Cazzullo-ebook/dp/B0F7L6HQJ4", "https://it.camelcamelcamel.com/product/B0F7L6HQJ4"],
    ["https://www.amazon.co.jp/-/en/Takara-Tomica/dp/B0C3G736Q3/", "https://jp.camelcamelcamel.com/product/B0C3G736Q3"],
    ["https://www.amazon.ca/LEGO-Buildable-Minifigure/dp/B0CV236PM6", "https://ca.camelcamelcamel.com/product/B0CV236PM6"],
    ["https://www.amazon.com.au/PANDORA-563050C00/dp/B0CV43BNCP", "https://au.camelcamelcamel.com/product/B0CV43BNCP"],
  ])("maps supported store %s", (input, expected) => {
    expect(buildCamelUrl(input)).toBe(expected);
  });

  // Marketplaces with no camelcamelcamel presence → null (button hidden).
  it.each([
    ["https://www.amazon.com.br/Novo-Echo-Show-11/dp/B0DYC5S7DK/?th=1"],
    ["https://www.amazon.com.mx/Contenedores/dp/B0BT8HWSSK/"],
    ["https://www.amazon.nl/-/en/DeLonghi-ECAM292/dp/B09CGRQ965"],
    ["https://www.amazon.pl/TP-Link-Tapo-H500/dp/B0F7Y3PMK8"],
    ["https://www.amazon.se/-/en/Deconovo-Blackout/dp/B08DR3CWRX/"],
    ["https://www.amazon.com.tr/LEGO-Star-Wars/dp/B0FPXFW8XB"],
    ["https://www.amazon.in/Multipurpose-Kitchen/dp/B095C981FC/"],
    ["https://www.amazon.sg/Sony-WF-C710N/dp/B0F2GLCWG9?rnid=6450031051&s=electronics"],
    ["https://www.amazon.ae/Tomodachi-Life/dp/B0GKPV34CK"],
    ["https://www.amazon.sa/-/en/SPEARPC-Wireless/dp/B0GSLHSYL6"],
    ["https://www.amazon.com.be/-/en/LEGO-Icons/dp/B0D5W8J5YV?ref_=pd_hp_d_btf_unk_B0D5W8J5YV"],
    ["https://www.amazon.eg/-/en/Unionaire-ARTO012HR5RCWPK/dp/B0965M11XZ/?th=1"],
  ])("returns null for unsupported store %s", (input) => {
    expect(buildCamelUrl(input)).toBeNull();
  });

  it("returns null for a non-Amazon URL", () => {
    expect(buildCamelUrl("https://www.ebay.com/item/123456")).toBeNull();
  });

  it("returns null for an Amazon URL without an ASIN", () => {
    expect(buildCamelUrl("https://www.amazon.com/s?k=headphones")).toBeNull();
  });

  it("returns null for an invalid URL", () => {
    expect(buildCamelUrl("not-a-url")).toBeNull();
  });
});

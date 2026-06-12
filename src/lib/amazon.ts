/**
 * Pure utilities for Amazon URL validation and ASIN extraction.
 * No side effects — safe to use in both server and client contexts.
 */

const ASIN_REGEX = /\/(?:dp|gp\/product|exec\/obidos\/asin)\/([A-Z0-9]{10})/i;

export function extractAsin(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("amazon.")) return null;
    const match = parsed.pathname.match(ASIN_REGEX);
    return match ? match[1].toUpperCase() : null;
  } catch {
    return null;
  }
}

export function isValidAmazonUrl(url: string): boolean {
  return extractAsin(url) !== null;
}

/** Returns true if the given seller name refers to Amazon itself (case-insensitive). */
export function isAmazonSeller(name: string): boolean {
  return /^amazon$/i.test(name.trim());
}

/**
 * Builds the AOD (All Offers Display) URL for a product.
 * The ?aod=1&th=1 parameters instruct Amazon to include all seller
 * offers in the page response, avoiding a separate offers-listing request.
 */
export function buildScrapeUrl(url: string): string {
  const asin = extractAsin(url);
  if (!asin) return url;
  try {
    const origin = new URL(url).origin;
    return `${origin}/dp/${asin}?aod=1&th=1&language=en_US`;
  } catch {
    return url;
  }
}

const DOMAIN_INFO: Record<string, { currency: string; locale: string; countryCode: string }> = {
  "amazon.com":    { currency: "USD", locale: "en-US", countryCode: "US" },
  "amazon.co.uk":  { currency: "GBP", locale: "en-GB", countryCode: "GB" },
  "amazon.de":     { currency: "EUR", locale: "de-DE", countryCode: "DE" },
  "amazon.fr":     { currency: "EUR", locale: "fr-FR", countryCode: "FR" },
  "amazon.es":     { currency: "EUR", locale: "es-ES", countryCode: "ES" },
  "amazon.it":     { currency: "EUR", locale: "it-IT", countryCode: "IT" },
  "amazon.co.jp":  { currency: "JPY", locale: "ja-JP", countryCode: "JP" },
  "amazon.ca":     { currency: "CAD", locale: "en-CA", countryCode: "CA" },
  "amazon.com.au": { currency: "AUD", locale: "en-AU", countryCode: "AU" },
  "amazon.com.br": { currency: "BRL", locale: "pt-BR", countryCode: "BR" },
  "amazon.com.mx": { currency: "MXN", locale: "es-MX", countryCode: "MX" },
  "amazon.nl":     { currency: "EUR", locale: "nl-NL", countryCode: "NL" },
  "amazon.pl":     { currency: "PLN", locale: "pl-PL", countryCode: "PL" },
  "amazon.se":     { currency: "SEK", locale: "sv-SE", countryCode: "SE" },
  "amazon.com.tr": { currency: "TRY", locale: "tr-TR", countryCode: "TR" },
  "amazon.in":     { currency: "INR", locale: "en-IN", countryCode: "IN" },
  "amazon.sg":     { currency: "SGD", locale: "en-SG", countryCode: "SG" },
  "amazon.ae":     { currency: "AED", locale: "ar-AE", countryCode: "AE" },
  "amazon.sa":     { currency: "SAR", locale: "ar-SA", countryCode: "SA" },
  "amazon.com.be": { currency: "EUR", locale: "nl-BE", countryCode: "BE" },
};

export function getAmazonDomainInfo(url: string): { currency: string; locale: string; countryCode: string } {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return DOMAIN_INFO[hostname] ?? { currency: "USD", locale: "en-US", countryCode: "US" };
  } catch {
    return { currency: "USD", locale: "en-US", countryCode: "US" };
  }
}

/**
 * Maps a supported Amazon marketplace hostname to its camelcamelcamel
 * subdomain. Only the marketplaces camelcamelcamel actually tracks are listed;
 * any other store has no camelcamelcamel presence. Keyed by hostname (not the
 * country code) on purpose: getAmazonDomainInfo falls back to "US" for unknown
 * domains, which would otherwise produce bogus links for unsupported stores.
 */
const CAMEL_SUBDOMAIN_BY_HOST: Record<string, string> = {
  "amazon.com": "www",
  "amazon.co.uk": "uk",
  "amazon.de": "de",
  "amazon.fr": "fr",
  "amazon.es": "es",
  "amazon.it": "it",
  "amazon.co.jp": "jp",
  "amazon.ca": "ca",
  "amazon.com.au": "au",
};

/**
 * Builds the camelcamelcamel price-history URL for an Amazon product, e.g.
 * https://es.camelcamelcamel.com/product/B09GPJHCQL for an amazon.es product.
 * Returns null when the ASIN can't be extracted or the marketplace is not
 * tracked by camelcamelcamel (so callers can hide the link).
 */
export function buildCamelUrl(url: string): string | null {
  const asin = extractAsin(url);
  if (!asin) return null;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const subdomain = CAMEL_SUBDOMAIN_BY_HOST[hostname];
    if (!subdomain) return null;
    return `https://${subdomain}.camelcamelcamel.com/product/${asin}`;
  } catch {
    return null;
  }
}

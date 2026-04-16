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
    return `${origin}/dp/${asin}?aod=1&th=1`;
  } catch {
    return url;
  }
}

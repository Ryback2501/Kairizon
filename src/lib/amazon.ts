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

export function buildAmazonUrl(asin: string, domain = "amazon.com"): string {
  return `https://www.${domain}/dp/${asin}`;
}

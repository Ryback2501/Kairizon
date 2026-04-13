import type { ScrapeResult } from "@/types";

export interface IScraper {
  scrape(url: string): Promise<ScrapeResult | null>;
}

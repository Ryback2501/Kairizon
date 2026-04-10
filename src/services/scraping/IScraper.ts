import type { ScrapeResult } from "@/types";

export interface IScraper {
  scrape(url: string, includeSecondHand?: boolean): Promise<ScrapeResult | null>;
}

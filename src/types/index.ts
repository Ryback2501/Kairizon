export type Product = {
  id: string;
  asin: string;
  title: string;
  image: string | null;
  url: string;
  currentPrice: number | null;
  targetPrice: number | null;
  lastChecked: Date | null;
  notified: boolean;
  inStock: boolean;
  trackStock: boolean;
  stockNotified: boolean;
  includeSecondHand: boolean;
  availableSellers: string;
  excludedSellers: string;
  createdAt: Date;
};

export type Seller = {
  name: string;
  price: number;
  shipping: number;
  isSecondHand: boolean;
};

export type ScrapeResult = {
  title: string;
  image: string | null;
  asin: string;
  inStock: boolean;
  sellers: Seller[];
};

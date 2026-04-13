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

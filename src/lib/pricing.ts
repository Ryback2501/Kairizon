import type { Seller } from "@/types";

export function computePrice(
  sellers: Seller[],
  includeSecondHand: boolean,
  excludedSellers: string[]
): number | null {
  const eligible = sellers.filter(
    (s) => !excludedSellers.includes(s.name) && (includeSecondHand || !s.isSecondHand)
  );
  if (eligible.length === 0) return null;
  return Math.min(...eligible.map((s) => s.price + s.shipping));
}

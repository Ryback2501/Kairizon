import type { Seller } from "@/types";

/**
 * Deduplicates sellers by name (case-insensitive), keeping the cheapest total per seller.
 * Amazon often lists the same seller in both the pinned offer and the regular offer list.
 */
export function deduplicateSellers(sellers: Seller[]): Seller[] {
  const seen = new Map<string, Seller>();
  for (const s of sellers) {
    const key = s.name.toLowerCase();
    const existing = seen.get(key);
    if (!existing || s.price + s.shipping < existing.price + existing.shipping) {
      seen.set(key, s);
    }
  }
  return Array.from(seen.values());
}

export function computePrice(
  sellers: Seller[],
  includeSecondHand: boolean,
  excludedSellers: string[]
): number | null {
  const eligible = sellers.filter(
    (s) =>
      !excludedSellers.some((e) => e.toLowerCase() === s.name.toLowerCase()) &&
      (includeSecondHand || !s.isSecondHand)
  );
  if (eligible.length === 0) return null;
  return Math.min(...eligible.map((s) => s.price + s.shipping));
}

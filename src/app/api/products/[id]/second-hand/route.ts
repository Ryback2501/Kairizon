import { NextRequest, NextResponse } from "next/server";
import { ProductRepository } from "@/repositories/ProductRepository";
import { computePrice } from "@/lib/pricing";
import type { Seller } from "@/types";
import { parseBody } from "@/lib/api";

const repo = new ProductRepository();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await repo.findById(id);
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = await parseBody<{ includeSecondHand?: unknown }>(req);
  if (!parsed.ok) return parsed.res;
  if (typeof parsed.data.includeSecondHand !== "boolean") {
    return NextResponse.json({ error: "includeSecondHand must be a boolean" }, { status: 400 });
  }

  const updated = await repo.updateIncludeSecondHand(id, parsed.data.includeSecondHand);

  let sellers: Seller[];
  let currentExcluded: string[];
  try {
    sellers = JSON.parse(updated.availableSellers);
    currentExcluded = JSON.parse(product.excludedSellers);
  } catch {
    return NextResponse.json({ error: "Corrupted seller data" }, { status: 500 });
  }
  const secondHandNames = sellers.filter((s) => s.isSecondHand).map((s) => s.name);

  // When disabling second-hand: add all second-hand seller names to the excluded list.
  // When re-enabling: remove them so their checkboxes come back ticked.
  let newExcluded: string[];
  if (!parsed.data.includeSecondHand) {
    newExcluded = Array.from(new Set([...currentExcluded, ...secondHandNames]));
  } else {
    const toRemove = new Set(secondHandNames);
    newExcluded = currentExcluded.filter((n) => !toRemove.has(n));
  }

  const withExcluded = await repo.updateExcludedSellers(id, newExcluded);
  const excluded: string[] = JSON.parse(withExcluded.excludedSellers);
  const currentPrice = computePrice(sellers, withExcluded.includeSecondHand, excluded);
  const final = await repo.updateCurrentPrice(id, currentPrice);

  return NextResponse.json(final);
}

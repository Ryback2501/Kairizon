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

  const parsed = await parseBody<{ excludedSellers?: unknown }>(req);
  if (!parsed.ok) return parsed.res;
  if (!Array.isArray(parsed.data.excludedSellers) || !parsed.data.excludedSellers.every((s) => typeof s === "string")) {
    return NextResponse.json({ error: "excludedSellers must be a string array" }, { status: 400 });
  }

  try {
    const updated = await repo.updateExcludedSellers(id, parsed.data.excludedSellers as string[]);

    let sellers: Seller[];
    let excluded: string[];
    try {
      sellers = JSON.parse(updated.availableSellers) as Seller[];
      excluded = JSON.parse(updated.excludedSellers) as string[];
    } catch {
      return NextResponse.json({ error: "Corrupted seller data" }, { status: 500 });
    }

    const currentPrice = computePrice(sellers, updated.includeSecondHand, excluded);
    const final = await repo.updateCurrentPrice(id, currentPrice);
    return NextResponse.json(final);
  } catch (err) {
    console.error(`[PATCH /api/products/${id}/excluded-sellers] Failed:`, err);
    return NextResponse.json({ error: "Failed to update excluded sellers" }, { status: 500 });
  }
}

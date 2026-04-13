import { NextRequest, NextResponse } from "next/server";
import { ProductRepository } from "@/repositories/ProductRepository";
import { computePrice } from "@/lib/pricing";
import type { Seller } from "@/types";

const repo = new ProductRepository();

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const product = await repo.findById(params.id);
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json() as { excludedSellers?: unknown };
  if (!Array.isArray(body.excludedSellers) || !body.excludedSellers.every((s) => typeof s === "string")) {
    return NextResponse.json({ error: "excludedSellers must be a string array" }, { status: 400 });
  }

  const updated = await repo.updateExcludedSellers(params.id, body.excludedSellers);

  const sellers: Seller[] = JSON.parse(updated.availableSellers);
  const excluded: string[] = JSON.parse(updated.excludedSellers);
  const currentPrice = computePrice(sellers, updated.includeSecondHand, excluded);
  const final = await repo.updateCurrentPrice(params.id, currentPrice);

  return NextResponse.json(final);
}

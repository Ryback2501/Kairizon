import { NextRequest, NextResponse } from "next/server";
import { ProductRepository } from "@/repositories/ProductRepository";
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

  const parsed = await parseBody<{ targetPrice?: unknown }>(req);
  if (!parsed.ok) return parsed.res;
  const { targetPrice: rawTargetPrice } = parsed.data;
  const targetPrice =
    rawTargetPrice === null ? null
    : typeof rawTargetPrice === "number" && rawTargetPrice > 0 ? rawTargetPrice
    : undefined;

  if (targetPrice === undefined) {
    return NextResponse.json({ error: "targetPrice must be a positive number or null" }, { status: 400 });
  }

  try {
    const updated = await repo.updateTargetPrice(id, targetPrice);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`[PATCH /api/products/${id}/target] Failed:`, err);
    return NextResponse.json({ error: "Failed to update target price" }, { status: 500 });
  }
}

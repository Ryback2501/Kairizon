import { NextRequest, NextResponse } from "next/server";
import { ProductRepository } from "@/repositories/ProductRepository";

const repo = new ProductRepository();

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const product = await repo.findById(params.id);
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json() as { targetPrice?: unknown };
  const targetPrice =
    body.targetPrice === null ? null
    : typeof body.targetPrice === "number" && body.targetPrice > 0 ? body.targetPrice
    : undefined;

  if (targetPrice === undefined) {
    return NextResponse.json({ error: "targetPrice must be a positive number or null" }, { status: 400 });
  }

  const updated = await repo.updateTargetPrice(params.id, targetPrice);
  return NextResponse.json(updated);
}

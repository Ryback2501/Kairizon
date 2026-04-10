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

  const body = await req.json() as { includeSecondHand?: unknown };
  if (typeof body.includeSecondHand !== "boolean") {
    return NextResponse.json({ error: "includeSecondHand must be a boolean" }, { status: 400 });
  }

  const updated = await repo.updateIncludeSecondHand(params.id, body.includeSecondHand);
  return NextResponse.json(updated);
}

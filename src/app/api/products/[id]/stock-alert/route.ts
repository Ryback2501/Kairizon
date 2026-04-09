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

  const body = await req.json() as { trackStock?: unknown };
  if (typeof body.trackStock !== "boolean") {
    return NextResponse.json({ error: "trackStock must be a boolean" }, { status: 400 });
  }

  const updated = await repo.updateTrackStock(params.id, body.trackStock);
  return NextResponse.json(updated);
}

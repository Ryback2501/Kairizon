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

  const parsed = await parseBody<{ trackStock?: unknown }>(req);
  if (!parsed.ok) return parsed.res;
  if (typeof parsed.data.trackStock !== "boolean") {
    return NextResponse.json({ error: "trackStock must be a boolean" }, { status: 400 });
  }

  const updated = await repo.updateTrackStock(id, parsed.data.trackStock);
  return NextResponse.json(updated);
}

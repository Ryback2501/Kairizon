import { NextRequest, NextResponse } from "next/server";
import { ProductRepository } from "@/repositories/ProductRepository";
import { parseBody } from "@/lib/api";

const repo = new ProductRepository();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseBody<{ notified?: unknown }>(req);
  if (!parsed.ok) return parsed.res;
  if (typeof parsed.data.notified !== "boolean") {
    return NextResponse.json({ error: "notified must be a boolean" }, { status: 400 });
  }
  await repo.setNotified(id, parsed.data.notified as boolean);
  const product = await repo.findById(id);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json(product);
}

import { NextRequest, NextResponse } from "next/server";
import { ProductRepository } from "@/repositories/ProductRepository";

const repo = new ProductRepository();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { notified?: unknown };
  if (typeof body.notified !== "boolean") {
    return NextResponse.json({ error: "notified must be a boolean" }, { status: 400 });
  }
  await repo.setNotified(id, body.notified);
  const product = await repo.findById(id);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json(product);
}

import { NextRequest, NextResponse } from "next/server";
import { ProductRepository } from "@/repositories/ProductRepository";

const repo = new ProductRepository();

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const product = await repo.findById(params.id);
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await repo.delete(params.id);
  return new NextResponse(null, { status: 204 });
}

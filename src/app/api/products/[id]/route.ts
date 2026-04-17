import { NextRequest, NextResponse } from "next/server";
import { ProductRepository } from "@/repositories/ProductRepository";

const repo = new ProductRepository();

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const product = await repo.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await repo.delete(id);
  } catch (err) {
    console.error(`[DELETE /api/products/${id}] Failed:`, err);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}

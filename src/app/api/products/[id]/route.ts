import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ProductRepository } from "@/repositories/ProductRepository";

const repo = new ProductRepository();

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await repo.findByUserId(session.user.id);
  const owned = products.find((p) => p.id === params.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await repo.delete(params.id);
  return new NextResponse(null, { status: 204 });
}

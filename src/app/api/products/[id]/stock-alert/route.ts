import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ProductRepository } from "@/repositories/ProductRepository";

const repo = new ProductRepository();

export async function PATCH(
  req: NextRequest,
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

  const body = await req.json() as { trackStock?: unknown };
  if (typeof body.trackStock !== "boolean") {
    return NextResponse.json({ error: "trackStock must be a boolean" }, { status: 400 });
  }

  const updated = await repo.updateTrackStock(params.id, body.trackStock);
  return NextResponse.json(updated);
}

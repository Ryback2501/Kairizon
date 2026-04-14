import { NextResponse } from "next/server";
import { runUpdate } from "@/lib/price-check-runner";

export async function POST() {
  await runUpdate();
  return NextResponse.json({ ok: true });
}

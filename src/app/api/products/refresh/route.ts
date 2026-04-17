import { NextResponse } from "next/server";
import { runUpdate } from "@/lib/price-check-runner";
import { isRateLimited, allow } from "@/lib/rate-limit";

const COOLDOWN_MS = 60_000; // 1 minute

export async function POST() {
  if (isRateLimited("refresh", COOLDOWN_MS)) {
    return NextResponse.json({ error: "Too many requests. Wait a minute before refreshing again." }, { status: 429 });
  }
  allow("refresh");
  try {
    await runUpdate();
  } catch (err) {
    console.error("[refresh] Price check failed:", err);
    return NextResponse.json({ error: "Price check failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

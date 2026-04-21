import { NextResponse } from "next/server";
import { cronStatus } from "@/lib/cron-status";
import packageJson from "../../../../package.json";

export async function GET() {
  return NextResponse.json({ version: packageJson.version, cron: cronStatus });
}

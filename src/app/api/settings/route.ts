import { NextRequest, NextResponse } from "next/server";
import { AppSettingsRepository } from "@/repositories/AppSettingsRepository";
import type { AppSettingsData } from "@/repositories/IAppSettingsRepository";

const repo = new AppSettingsRepository();

export async function GET() {
  const settings = await repo.get();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as Partial<AppSettingsData>;
  const current = await repo.get();
  const updated = await repo.save({
    smtpHost: typeof body.smtpHost === "string" ? body.smtpHost : current.smtpHost,
    smtpPort: typeof body.smtpPort === "number" ? body.smtpPort : current.smtpPort,
    smtpUser: typeof body.smtpUser === "string" ? body.smtpUser : current.smtpUser,
    smtpPass: typeof body.smtpPass === "string" ? body.smtpPass : current.smtpPass,
    smtpFrom: typeof body.smtpFrom === "string" ? body.smtpFrom : current.smtpFrom,
  });
  return NextResponse.json(updated);
}

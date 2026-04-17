import { NextRequest, NextResponse } from "next/server";
import { AppSettingsRepository } from "@/repositories/AppSettingsRepository";
import type { AppSettingsData } from "@/repositories/IAppSettingsRepository";
import { parseBody } from "@/lib/api";

const repo = new AppSettingsRepository();

// Sentinel returned to the client in place of the real password.
// If the client sends this value back unchanged, the password is not updated.
const SMTPPASS_MASK = "••••••••";

function maskSettings(settings: AppSettingsData): AppSettingsData {
  return { ...settings, smtpPass: settings.smtpPass ? SMTPPASS_MASK : "" };
}

export async function GET() {
  try {
    const settings = await repo.get();
    return NextResponse.json(maskSettings(settings));
  } catch (err) {
    console.error("[GET /api/settings] Failed:", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const parsed = await parseBody<Partial<AppSettingsData>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;

  if (typeof body.smtpPort === "number" && (body.smtpPort < 1 || body.smtpPort > 65535)) {
    return NextResponse.json({ error: "smtpPort must be between 1 and 65535" }, { status: 400 });
  }

  try {
    const current = await repo.get();
    const updated = await repo.save({
      smtpHost: typeof body.smtpHost === "string" ? body.smtpHost : current.smtpHost,
      smtpPort: typeof body.smtpPort === "number" ? body.smtpPort : current.smtpPort,
      smtpUser: typeof body.smtpUser === "string" ? body.smtpUser : current.smtpUser,
      // Keep the current password if the client sent back the mask unchanged
      smtpPass: typeof body.smtpPass === "string" && body.smtpPass !== SMTPPASS_MASK
        ? body.smtpPass
        : current.smtpPass,
      smtpFrom: typeof body.smtpFrom === "string" ? body.smtpFrom : current.smtpFrom,
    });
    return NextResponse.json(maskSettings(updated));
  } catch (err) {
    console.error("[PUT /api/settings] Failed:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

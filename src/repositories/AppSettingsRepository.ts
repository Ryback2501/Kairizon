import { db as prisma } from "@/lib/db";
import type { AppSettingsData, IAppSettingsRepository } from "./IAppSettingsRepository";

export class AppSettingsRepository implements IAppSettingsRepository {
  async get(): Promise<AppSettingsData> {
    const row = await prisma.appSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    });
    return {
      smtpHost: row.smtpHost,
      smtpPort: row.smtpPort,
      smtpUser: row.smtpUser,
      smtpPass: row.smtpPass,
      smtpFrom: row.smtpFrom,
    };
  }

  async save(settings: AppSettingsData): Promise<AppSettingsData> {
    const row = await prisma.appSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...settings },
      update: settings,
    });
    return {
      smtpHost: row.smtpHost,
      smtpPort: row.smtpPort,
      smtpUser: row.smtpUser,
      smtpPass: row.smtpPass,
      smtpFrom: row.smtpFrom,
    };
  }
}

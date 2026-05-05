import { db } from "@/lib/db";
import type { AppSettingsData, IAppSettingsRepository } from "./IAppSettingsRepository";

export class AppSettingsRepository implements IAppSettingsRepository {
  async get(): Promise<AppSettingsData> {
    const row = db.prepare(`SELECT * FROM "AppSettings" WHERE "id" = 'singleton'`).get() as AppSettingsData | undefined;
    if (row) return row;
    db.prepare(`INSERT INTO "AppSettings" ("id") VALUES ('singleton')`).run();
    return { smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "", smtpFrom: "" };
  }

  async save(settings: AppSettingsData): Promise<AppSettingsData> {
    db.prepare(`
      INSERT INTO "AppSettings" ("id","smtpHost","smtpPort","smtpUser","smtpPass","smtpFrom")
      VALUES ('singleton',?,?,?,?,?)
      ON CONFLICT("id") DO UPDATE SET
        "smtpHost" = excluded."smtpHost",
        "smtpPort" = excluded."smtpPort",
        "smtpUser" = excluded."smtpUser",
        "smtpPass" = excluded."smtpPass",
        "smtpFrom" = excluded."smtpFrom"
    `).run(settings.smtpHost, settings.smtpPort, settings.smtpUser, settings.smtpPass, settings.smtpFrom);
    return settings;
  }
}

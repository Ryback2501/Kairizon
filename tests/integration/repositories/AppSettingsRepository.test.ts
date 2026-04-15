import { PrismaClient } from "@prisma/client";
import { AppSettingsRepository } from "@/repositories/AppSettingsRepository";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.appSettings.deleteMany({ where: { id: "singleton" } });
  await prisma.$disconnect();
});

describe("AppSettingsRepository", () => {
  const repo = new AppSettingsRepository();

  it("get() creates the singleton row with empty defaults on first call", async () => {
    await prisma.appSettings.deleteMany({ where: { id: "singleton" } });
    const settings = await repo.get();
    expect(settings.smtpHost).toBe("");
    expect(settings.smtpPort).toBe(587);
    expect(settings.smtpUser).toBe("");
    expect(settings.smtpPass).toBe("");
    expect(settings.smtpFrom).toBe("");
  });

  it("get() is idempotent — subsequent calls return same row", async () => {
    const a = await repo.get();
    const b = await repo.get();
    expect(a).toEqual(b);
  });

  it("save() persists all fields", async () => {
    const saved = await repo.save({
      smtpHost: "smtp.example.com",
      smtpPort: 465,
      smtpUser: "user@example.com",
      smtpPass: "secret",
      smtpFrom: "App <user@example.com>",
    });

    expect(saved.smtpHost).toBe("smtp.example.com");
    expect(saved.smtpPort).toBe(465);
    expect(saved.smtpUser).toBe("user@example.com");
    expect(saved.smtpPass).toBe("secret");
    expect(saved.smtpFrom).toBe("App <user@example.com>");
  });

  it("save() is durable — get() after save() returns the saved values", async () => {
    const settings = await repo.get();
    expect(settings.smtpHost).toBe("smtp.example.com");
    expect(settings.smtpUser).toBe("user@example.com");
  });

  it("save() overwrites previous values", async () => {
    await repo.save({
      smtpHost: "smtp.other.com",
      smtpPort: 587,
      smtpUser: "other@other.com",
      smtpPass: "newpass",
      smtpFrom: "Other <other@other.com>",
    });

    const settings = await repo.get();
    expect(settings.smtpHost).toBe("smtp.other.com");
    expect(settings.smtpUser).toBe("other@other.com");
  });
});

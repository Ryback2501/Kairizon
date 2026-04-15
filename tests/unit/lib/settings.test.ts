import { isSettingsConfigured } from "@/repositories/IAppSettingsRepository";
import type { AppSettingsData } from "@/repositories/IAppSettingsRepository";

const VALID: AppSettingsData = {
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpUser: "user@gmail.com",
  smtpPass: "secret",
  smtpFrom: "Kairizon <user@gmail.com>",
};

describe("isSettingsConfigured", () => {
  it("returns true when all required fields are filled", () => {
    expect(isSettingsConfigured(VALID)).toBe(true);
  });

  it("returns false when smtpHost is empty", () => {
    expect(isSettingsConfigured({ ...VALID, smtpHost: "" })).toBe(false);
  });

  it("returns false when smtpUser is empty", () => {
    expect(isSettingsConfigured({ ...VALID, smtpUser: "" })).toBe(false);
  });

  it("returns false when smtpPass is empty", () => {
    expect(isSettingsConfigured({ ...VALID, smtpPass: "" })).toBe(false);
  });

  it("returns false when smtpFrom is empty", () => {
    expect(isSettingsConfigured({ ...VALID, smtpFrom: "" })).toBe(false);
  });

  it("is not affected by smtpPort value (not required for configured check)", () => {
    expect(isSettingsConfigured({ ...VALID, smtpPort: 0 })).toBe(true);
  });
});

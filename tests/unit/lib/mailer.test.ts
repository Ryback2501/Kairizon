const mockCreateTransport = jest.fn().mockReturnValue({});

jest.mock("nodemailer", () => ({
  default: { createTransport: mockCreateTransport },
  createTransport: mockCreateTransport,
}));

import { createTransporter } from "@/lib/mailer";
import type { AppSettingsData } from "@/repositories/IAppSettingsRepository";

function makeSettings(overrides: Partial<AppSettingsData> = {}): AppSettingsData {
  return {
    smtpHost: "smtp.example.com",
    smtpPort: 587,
    smtpUser: "user@example.com",
    smtpPass: "secret",
    smtpFrom: "App <user@example.com>",
    ...overrides,
  };
}

beforeEach(() => mockCreateTransport.mockClear());

describe("createTransporter", () => {
  it("sets secure=false for port 587", () => {
    createTransporter(makeSettings({ smtpPort: 587 }));
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: false })
    );
  });

  it("sets secure=true for port 465", () => {
    createTransporter(makeSettings({ smtpPort: 465 }));
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true })
    );
  });

  it("passes host, port, and auth credentials to createTransport", () => {
    createTransporter(makeSettings({ smtpHost: "smtp.test.com", smtpPort: 587, smtpUser: "u", smtpPass: "p" }));
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.test.com",
        port: 587,
        auth: { user: "u", pass: "p" },
      })
    );
  });
});

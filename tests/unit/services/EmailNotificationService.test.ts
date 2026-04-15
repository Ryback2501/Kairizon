import { EmailNotificationService } from "@/services/notification/EmailNotificationService";
import type { IAppSettingsRepository, AppSettingsData } from "@/repositories/IAppSettingsRepository";

const mockSendMail = jest.fn().mockResolvedValue(undefined);

jest.mock("@/lib/mailer", () => ({
  createTransporter: jest.fn(() => ({ sendMail: mockSendMail })),
}));

const CONFIGURED_SETTINGS: AppSettingsData = {
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpUser: "user@gmail.com",
  smtpPass: "secret",
  smtpFrom: "Kairizon <user@gmail.com>",
};

const EMPTY_SETTINGS: AppSettingsData = {
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "",
};

function makeSettingsRepo(settings: AppSettingsData): jest.Mocked<IAppSettingsRepository> {
  return {
    get: jest.fn().mockResolvedValue(settings),
    save: jest.fn(),
  };
}

describe("EmailNotificationService.sendPriceAlert", () => {
  beforeEach(() => mockSendMail.mockClear());

  it("sends an email with the correct subject and recipient", async () => {
    const service = new EmailNotificationService(makeSettingsRepo(CONFIGURED_SETTINGS));
    await service.sendPriceAlert({
      productTitle: "Sony Headphones",
      productUrl: "https://amazon.com/dp/B001",
      currentPrice: 35.99,
      targetPrice: 40,
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mail = mockSendMail.mock.calls[0][0];
    expect(mail.subject).toBe("Price drop: Sony Headphones");
    expect(mail.to).toBe("user@gmail.com");
    expect(mail.from).toBe("Kairizon <user@gmail.com>");
  });

  it("includes current price and target price in the email body", async () => {
    const service = new EmailNotificationService(makeSettingsRepo(CONFIGURED_SETTINGS));
    await service.sendPriceAlert({
      productTitle: "Sony Headphones",
      productUrl: "https://amazon.com/dp/B001",
      currentPrice: 35.99,
      targetPrice: 40,
    });

    const { html } = mockSendMail.mock.calls[0][0];
    expect(html).toContain("35.99");
    expect(html).toContain("40.00");
    expect(html).toContain("Sony Headphones");
  });

  it("skips sending when SMTP is not configured", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const service = new EmailNotificationService(makeSettingsRepo(EMPTY_SETTINGS));
    await service.sendPriceAlert({
      productTitle: "Test",
      productUrl: "https://amazon.com/dp/B001",
      currentPrice: 10,
      targetPrice: 20,
    });

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("SMTP not configured"));
    warnSpy.mockRestore();
  });
});

describe("EmailNotificationService.sendStockAlert", () => {
  beforeEach(() => mockSendMail.mockClear());

  it("sends an email with the correct subject and recipient", async () => {
    const service = new EmailNotificationService(makeSettingsRepo(CONFIGURED_SETTINGS));
    await service.sendStockAlert({
      productTitle: "Sony Headphones",
      productUrl: "https://amazon.com/dp/B001",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mail = mockSendMail.mock.calls[0][0];
    expect(mail.subject).toBe("Back in stock: Sony Headphones");
    expect(mail.to).toBe("user@gmail.com");
    expect(mail.from).toBe("Kairizon <user@gmail.com>");
  });

  it("includes the product title in the email body", async () => {
    const service = new EmailNotificationService(makeSettingsRepo(CONFIGURED_SETTINGS));
    await service.sendStockAlert({
      productTitle: "Sony Headphones",
      productUrl: "https://amazon.com/dp/B001",
    });

    const { html } = mockSendMail.mock.calls[0][0];
    expect(html).toContain("Sony Headphones");
  });

  it("skips sending when SMTP is not configured", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const service = new EmailNotificationService(makeSettingsRepo(EMPTY_SETTINGS));
    await service.sendStockAlert({
      productTitle: "Test",
      productUrl: "https://amazon.com/dp/B001",
    });

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("SMTP not configured"));
    warnSpy.mockRestore();
  });
});

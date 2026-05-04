import { createTransporter } from "@/lib/mailer";
import { getAmazonDomainInfo } from "@/lib/amazon";
import { renderTemplate, PRICE_ALERT_TEMPLATE, STOCK_ALERT_TEMPLATE } from "@/lib/email-templates";
import { isSettingsConfigured } from "@/repositories/IAppSettingsRepository";
import type { IAppSettingsRepository } from "@/repositories/IAppSettingsRepository";
import type {
  INotificationService,
  PriceAlertParams,
  StockAlertParams,
} from "./INotificationService";

export class EmailNotificationService implements INotificationService {
  constructor(private readonly settingsRepo: IAppSettingsRepository) {}

  async sendPriceAlert(params: PriceAlertParams): Promise<void> {
    const settings = await this.settingsRepo.get();
    if (!isSettingsConfigured(settings)) {
      console.warn("[email] SMTP not configured — skipping price alert");
      return;
    }
    const transporter = createTransporter(settings);
    try {
      const { currency, locale } = getAmazonDomainInfo(params.productUrl);
      const fmt = (n: number) => n.toLocaleString(locale, { style: "currency", currency });
      await transporter.sendMail({
        from: settings.smtpFrom,
        to: settings.smtpUser,
        subject: `Price drop: ${params.productTitle}`,
        html: renderTemplate(PRICE_ALERT_TEMPLATE, {
          PRODUCT_TITLE: params.productTitle,
          PRODUCT_URL: params.productUrl,
          CURRENT_PRICE: fmt(params.currentPrice),
          TARGET_PRICE: fmt(params.targetPrice),
          PRODUCT_IMAGE: params.productImage ?? "",
        }),
      });
    } catch (err) {
      console.error("[email] Failed to send price alert:", err);
      throw err;
    }
  }

  async sendStockAlert(params: StockAlertParams): Promise<void> {
    const settings = await this.settingsRepo.get();
    if (!isSettingsConfigured(settings)) {
      console.warn("[email] SMTP not configured — skipping stock alert");
      return;
    }
    const transporter = createTransporter(settings);
    try {
      await transporter.sendMail({
        from: settings.smtpFrom,
        to: settings.smtpUser,
        subject: `Back in stock: ${params.productTitle}`,
        html: renderTemplate(STOCK_ALERT_TEMPLATE, {
          PRODUCT_TITLE: params.productTitle,
          PRODUCT_URL: params.productUrl,
          PRODUCT_IMAGE: params.productImage ?? "",
        }),
      });
    } catch (err) {
      console.error("[email] Failed to send stock alert:", err);
      throw err;
    }
  }
}

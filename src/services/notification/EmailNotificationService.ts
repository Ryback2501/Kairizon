import { createTransporter } from "@/lib/mailer";
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
      await transporter.sendMail({
        from: settings.smtpFrom,
        to: settings.smtpUser,
        subject: `Price drop: ${params.productTitle}`,
        html: `
          <p>Good news! The price for <strong>${params.productTitle}</strong> has dropped to
          <strong>$${params.currentPrice.toFixed(2)}</strong> — at or below your target of
          $${params.targetPrice.toFixed(2)}.</p>
          <p><a href="${params.productUrl}">View on Amazon</a></p>
        `,
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
        html: `
          <p><strong>${params.productTitle}</strong> is back in stock!</p>
          <p><a href="${params.productUrl}">View on Amazon</a></p>
        `,
      });
    } catch (err) {
      console.error("[email] Failed to send stock alert:", err);
      throw err;
    }
  }
}

import { createTransporter } from "@/lib/mailer";
import type {
  INotificationService,
  PriceAlertParams,
  StockAlertParams,
} from "./INotificationService";

export class EmailNotificationService implements INotificationService {
  async sendPriceAlert(params: PriceAlertParams): Promise<void> {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_USER,
      subject: `Price drop: ${params.productTitle}`,
      html: `
        <p>Good news! The price for <strong>${params.productTitle}</strong> has dropped to
        <strong>$${params.currentPrice.toFixed(2)}</strong> — at or below your target of
        $${params.targetPrice.toFixed(2)}.</p>
        <p><a href="${params.productUrl}">View on Amazon</a></p>
      `,
    });
  }

  async sendStockAlert(params: StockAlertParams): Promise<void> {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_USER,
      subject: `Back in stock: ${params.productTitle}`,
      html: `
        <p><strong>${params.productTitle}</strong> is back in stock!</p>
        <p><a href="${params.productUrl}">View on Amazon</a></p>
      `,
    });
  }
}

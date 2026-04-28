import fs from "fs";
import path from "path";

export const PRICE_ALERT_TEMPLATE = "email-price-alert.html";
export const STOCK_ALERT_TEMPLATE = "email-stock-alert.html";

function getDataDir(): string {
  const filePath = (process.env.DATABASE_URL ?? "").replace(/^file:/, "");
  return path.dirname(path.resolve(filePath));
}

const DEFAULT_PRICE_ALERT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <h2>Price drop alert</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="width: 130px; vertical-align: top; padding-right: 16px;">
        <img src="{{PRODUCT_IMAGE}}" alt="{{PRODUCT_TITLE}}" style="width: 120px; border-radius: 4px; display: block;" />
      </td>
      <td style="vertical-align: top;">
        <p style="margin: 0 0 8px;">
          <strong>{{PRODUCT_TITLE}}</strong> is now <strong>{{CURRENT_PRICE}}</strong>,
          at or below your target of {{TARGET_PRICE}}.
        </p>
        <p style="margin: 0;"><a href="{{PRODUCT_URL}}">View on Amazon</a></p>
      </td>
    </tr>
  </table>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="font-size: 12px; color: #9ca3af;">Sent by Kairizon &mdash; your Amazon price tracker.</p>
</body>
</html>`;

const DEFAULT_STOCK_ALERT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <h2>Back in stock</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="width: 130px; vertical-align: top; padding-right: 16px;">
        <img src="{{PRODUCT_IMAGE}}" alt="{{PRODUCT_TITLE}}" style="width: 120px; border-radius: 4px; display: block;" />
      </td>
      <td style="vertical-align: top;">
        <p style="margin: 0 0 8px;"><strong>{{PRODUCT_TITLE}}</strong> is back in stock on Amazon.</p>
        <p style="margin: 0;"><a href="{{PRODUCT_URL}}">View on Amazon</a></p>
      </td>
    </tr>
  </table>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="font-size: 12px; color: #9ca3af;">Sent by Kairizon &mdash; your Amazon price tracker.</p>
</body>
</html>`;

export function ensureEmailTemplates(): void {
  const dir = getDataDir();
  const priceAlertPath = path.join(dir, PRICE_ALERT_TEMPLATE);
  const stockAlertPath = path.join(dir, STOCK_ALERT_TEMPLATE);

  if (!fs.existsSync(priceAlertPath)) {
    fs.writeFileSync(priceAlertPath, DEFAULT_PRICE_ALERT, "utf-8");
    console.log(`[templates] Created ${PRICE_ALERT_TEMPLATE}`);
  }
  if (!fs.existsSync(stockAlertPath)) {
    fs.writeFileSync(stockAlertPath, DEFAULT_STOCK_ALERT, "utf-8");
    console.log(`[templates] Created ${STOCK_ALERT_TEMPLATE}`);
  }
}

export function renderTemplate(filename: string, vars: Record<string, string>): string {
  const tpl = fs.readFileSync(path.join(getDataDir(), filename), "utf-8");
  return Object.entries(vars).reduce(
    (html, [k, v]) => html.replaceAll(`{{${k}}}`, v),
    tpl
  );
}

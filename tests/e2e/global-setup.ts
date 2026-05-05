import Database from "better-sqlite3";
import { resolve } from "path";
import { randomUUID } from "crypto";

const TEST_ASIN = "B00E2ETEST1";

export default function globalSetup() {
  const url = process.env.DATABASE_URL ?? "";
  const filePath = url.startsWith("file:") ? url.slice(5) : url;
  const db = new Database(resolve(filePath));
  try {
    db.prepare(`
      INSERT INTO "AppSettings" ("id","smtpHost","smtpPort","smtpUser","smtpPass","smtpFrom")
      VALUES ('singleton','smtp.e2e-test.com',587,'e2e@test.com','e2e-pass','E2E <e2e@test.com>')
      ON CONFLICT("id") DO UPDATE SET
        "smtpHost" = excluded."smtpHost",
        "smtpPort" = excluded."smtpPort",
        "smtpUser" = excluded."smtpUser",
        "smtpPass" = excluded."smtpPass",
        "smtpFrom" = excluded."smtpFrom"
    `).run();

    db.prepare(`DELETE FROM "Product" WHERE "asin" = ?`).run(TEST_ASIN);
    db.prepare(`
      INSERT INTO "Product" ("id","asin","title","image","url","currentPrice","inStock","availableSellers","excludedSellers","includeSecondHand")
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(
      randomUUID(),
      TEST_ASIN,
      "E2E Test Product",
      null,
      `https://www.amazon.com/dp/${TEST_ASIN}`,
      49.99,
      1,
      JSON.stringify([
        { name: "Amazon", price: 49.99, shipping: 0, isSecondHand: false },
        { name: "UsedSeller", price: 30.0, shipping: 0, isSecondHand: true },
      ]),
      JSON.stringify([]),
      1,
    );
  } finally {
    db.close();
  }
}

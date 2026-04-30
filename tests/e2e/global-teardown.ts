import Database from "better-sqlite3";
import { resolve } from "path";

export default function globalTeardown() {
  const url = process.env.DATABASE_URL ?? "";
  const filePath = url.startsWith("file:") ? url.slice(5) : url;
  const db = new Database(resolve(filePath));
  try {
    db.prepare(`DELETE FROM "Product" WHERE "asin" = ?`).run("B00E2ETEST1");
    db.prepare(`DELETE FROM "AppSettings" WHERE "id" = 'singleton'`).run();
  } finally {
    db.close();
  }
}

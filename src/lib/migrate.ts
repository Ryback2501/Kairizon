import Database from "better-sqlite3";
import { resolve } from "path";

export const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "smtpHost" TEXT NOT NULL DEFAULT '',
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpUser" TEXT NOT NULL DEFAULT '',
    "smtpPass" TEXT NOT NULL DEFAULT '',
    "smtpFrom" TEXT NOT NULL DEFAULT '',
    "theme" TEXT NOT NULL DEFAULT 'light'
  )`,
  `CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asin" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT,
    "url" TEXT NOT NULL,
    "currentPrice" REAL,
    "targetPrice" REAL,
    "lastChecked" DATETIME,
    "notified" INTEGER NOT NULL DEFAULT 0,
    "inStock" INTEGER NOT NULL DEFAULT 1,
    "trackStock" INTEGER NOT NULL DEFAULT 0,
    "stockNotified" INTEGER NOT NULL DEFAULT 0,
    "includeSecondHand" INTEGER NOT NULL DEFAULT 1,
    "availableSellers" TEXT NOT NULL DEFAULT '[]',
    "excludedSellers" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Product_asin_key" ON "Product"("asin")`,
];

function parsePath(url: string): string {
  const filePath = url.startsWith("file:") ? url.slice(5) : url;
  return filePath === ":memory:" ? filePath : resolve(filePath);
}

/**
 * Idempotently adds a column to an existing table. The CREATE TABLE statements
 * use IF NOT EXISTS and so never alter a table that already exists, so columns
 * added after a table's first creation need an explicit ALTER guarded by a
 * column-existence check.
 */
function addColumnIfMissing(db: Database.Database, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[];
  if (!columns.some((col) => col.name === column)) {
    db.exec(`ALTER TABLE "${table}" ADD COLUMN ${definition}`);
  }
}

export function runMigrations(): void {
  const dbPath = parsePath(process.env.DATABASE_URL ?? ":memory:");
  const db = new Database(dbPath);
  try {
    for (const sql of SCHEMA_SQL) {
      db.exec(sql);
    }
    // Additive migrations for databases created before a column existed.
    addColumnIfMissing(db, "AppSettings", "theme", `"theme" TEXT NOT NULL DEFAULT 'light'`);
    console.log("[migrate] Schema up to date");
  } finally {
    db.close();
  }
}

import Database from "better-sqlite3";
import { resolve } from "path";

const globalForDb = globalThis as unknown as { db: Database.Database };

function parsePath(url: string): string {
  const filePath = url.startsWith("file:") ? url.slice(5) : url;
  return filePath === ":memory:" ? filePath : resolve(filePath);
}

function createDb(): Database.Database {
  return new Database(parsePath(process.env.DATABASE_URL ?? ":memory:"));
}

export const db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

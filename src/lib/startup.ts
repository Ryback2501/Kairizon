import { db } from "@/lib/db";

export async function validateStartup(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "[startup] DATABASE_URL is not set. " +
        "Set DATABASE_FILE (e.g. kairizon.db) or DATABASE_URL before starting."
    );
  }

  try {
    db.prepare("SELECT 1").get();
    console.log("[startup] Database connection OK");
  } catch (err) {
    throw new Error(
      `[startup] Database connection failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

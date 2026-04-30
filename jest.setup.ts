// Apply schema to the exact db instance used by repositories (works for both
// file and in-memory databases — avoids the separate-connection problem with :memory:).
import { db } from "./src/lib/db";
import { SCHEMA_SQL } from "./src/lib/migrate";
for (const sql of SCHEMA_SQL) {
  db.exec(sql);
}

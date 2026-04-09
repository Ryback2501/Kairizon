-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asin" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT,
    "url" TEXT NOT NULL,
    "currentPrice" REAL,
    "targetPrice" REAL,
    "lastChecked" DATETIME,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "trackStock" BOOLEAN NOT NULL DEFAULT false,
    "stockNotified" BOOLEAN NOT NULL DEFAULT false,
    "includeSecondHand" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Product" ("asin", "createdAt", "currentPrice", "id", "image", "inStock", "lastChecked", "notified", "stockNotified", "targetPrice", "title", "trackStock", "url") SELECT "asin", "createdAt", "currentPrice", "id", "image", "inStock", "lastChecked", "notified", "stockNotified", "targetPrice", "title", "trackStock", "url" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_asin_key" ON "Product"("asin");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

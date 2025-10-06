-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "apiToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dailySyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailySyncHour" INTEGER NOT NULL DEFAULT 2,
    "dailySyncMinute" INTEGER NOT NULL DEFAULT 0,
    "weeklySyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weeklySyncDay" INTEGER NOT NULL DEFAULT 0,
    "weeklySyncHour" INTEGER NOT NULL DEFAULT 3,
    "weeklySyncMinute" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_companies" ("apiToken", "apiUrl", "code", "createdAt", "id", "isActive", "name", "updatedAt") SELECT "apiToken", "apiUrl", "code", "createdAt", "id", "isActive", "name", "updatedAt" FROM "companies";
DROP TABLE "companies";
ALTER TABLE "new_companies" RENAME TO "companies";
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

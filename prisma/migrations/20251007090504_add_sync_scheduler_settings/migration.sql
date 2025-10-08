/*
  Warnings:

  - You are about to drop the column `dailySyncEnabled` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `weeklySyncEnabled` on the `companies` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "apiToken" TEXT NOT NULL,
    "erpApiToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncType" TEXT NOT NULL DEFAULT 'DAILY',
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncIntervalMinutes" INTEGER DEFAULT 30,
    "lastSyncAt" DATETIME,
    "dailySyncHour" INTEGER NOT NULL DEFAULT 2,
    "dailySyncMinute" INTEGER NOT NULL DEFAULT 0,
    "weeklySyncDay" INTEGER NOT NULL DEFAULT 0,
    "weeklySyncHour" INTEGER NOT NULL DEFAULT 3,
    "weeklySyncMinute" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_companies" ("apiToken", "apiUrl", "code", "createdAt", "dailySyncHour", "dailySyncMinute", "erpApiToken", "id", "isActive", "name", "updatedAt", "weeklySyncDay", "weeklySyncHour", "weeklySyncMinute") SELECT "apiToken", "apiUrl", "code", "createdAt", "dailySyncHour", "dailySyncMinute", "erpApiToken", "id", "isActive", "name", "updatedAt", "weeklySyncDay", "weeklySyncHour", "weeklySyncMinute" FROM "companies";
DROP TABLE "companies";
ALTER TABLE "new_companies" RENAME TO "companies";
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sales_change_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderKey" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "oldHash" TEXT,
    "newHash" TEXT NOT NULL,
    "oldVersion" INTEGER,
    "newVersion" INTEGER NOT NULL,
    "changedFields" TEXT,
    "orderSnapshot" TEXT,
    "syncBatchId" TEXT NOT NULL,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_change_logs_syncBatchId_fkey" FOREIGN KEY ("syncBatchId") REFERENCES "sync_batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sales_change_logs" ("changeType", "changedFields", "detectedAt", "id", "newHash", "newVersion", "oldHash", "oldVersion", "orderKey", "syncBatchId") SELECT "changeType", "changedFields", "detectedAt", "id", "newHash", "newVersion", "oldHash", "oldVersion", "orderKey", "syncBatchId" FROM "sales_change_logs";
DROP TABLE "sales_change_logs";
ALTER TABLE "new_sales_change_logs" RENAME TO "sales_change_logs";
CREATE INDEX "sales_change_logs_orderKey_idx" ON "sales_change_logs"("orderKey");
CREATE INDEX "sales_change_logs_syncBatchId_idx" ON "sales_change_logs"("syncBatchId");
CREATE INDEX "sales_change_logs_detectedAt_idx" ON "sales_change_logs"("detectedAt");
CREATE TABLE "new_sales_summary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sheetDate" TEXT NOT NULL,
    "mainAccountingCode" TEXT NOT NULL DEFAULT '',
    "accountingCode" TEXT NOT NULL,
    "isMainCombo" BOOLEAN NOT NULL,
    "taxPercent" REAL NOT NULL,
    "branchID" INTEGER NOT NULL,
    "branchCode" TEXT NOT NULL,
    "isExternal" BOOLEAN NOT NULL,
    "quantity" REAL NOT NULL,
    "subTotal" REAL NOT NULL,
    "taxTotal" REAL NOT NULL,
    "total" REAL NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "dataHash" TEXT NOT NULL,
    "lastModified" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncBatchId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_sales_summary" ("accountingCode", "branchCode", "branchID", "createdAt", "dataHash", "id", "isExternal", "isMainCombo", "lastModified", "lastSyncBatchId", "mainAccountingCode", "quantity", "sheetDate", "subTotal", "taxPercent", "taxTotal", "total", "version") SELECT "accountingCode", "branchCode", "branchID", "createdAt", "dataHash", "id", "isExternal", "isMainCombo", "lastModified", "lastSyncBatchId", coalesce("mainAccountingCode", '') AS "mainAccountingCode", "quantity", "sheetDate", "subTotal", "taxPercent", "taxTotal", "total", "version" FROM "sales_summary";
DROP TABLE "sales_summary";
ALTER TABLE "new_sales_summary" RENAME TO "sales_summary";
CREATE INDEX "sales_summary_sheetDate_idx" ON "sales_summary"("sheetDate");
CREATE INDEX "sales_summary_branchCode_idx" ON "sales_summary"("branchCode");
CREATE INDEX "sales_summary_lastModified_idx" ON "sales_summary"("lastModified");
CREATE UNIQUE INDEX "sales_summary_sheetDate_branchCode_accountingCode_isMainCombo_taxPercent_mainAccountingCode_key" ON "sales_summary"("sheetDate", "branchCode", "accountingCode", "isMainCombo", "taxPercent", "mainAccountingCode");
CREATE TABLE "new_sales_summary_deltas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sheetDate" TEXT NOT NULL,
    "mainAccountingCode" TEXT NOT NULL DEFAULT '',
    "accountingCode" TEXT NOT NULL,
    "isMainCombo" BOOLEAN NOT NULL,
    "taxPercent" REAL NOT NULL,
    "branchID" INTEGER NOT NULL,
    "branchCode" TEXT NOT NULL,
    "isExternal" BOOLEAN NOT NULL,
    "changeType" TEXT NOT NULL,
    "oldQuantity" REAL,
    "oldSubTotal" REAL,
    "oldTaxTotal" REAL,
    "oldTotal" REAL,
    "newQuantity" REAL,
    "newSubTotal" REAL,
    "newTaxTotal" REAL,
    "newTotal" REAL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncBatchId" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" DATETIME,
    "snapshotId" TEXT,
    "deltaType" TEXT NOT NULL,
    CONSTRAINT "sales_summary_deltas_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "erp_snapshots" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_sales_summary_deltas" ("accountingCode", "branchCode", "branchID", "changeType", "changedAt", "deltaType", "id", "isExternal", "isMainCombo", "mainAccountingCode", "newQuantity", "newSubTotal", "newTaxTotal", "newTotal", "oldQuantity", "oldSubTotal", "oldTaxTotal", "oldTotal", "processed", "processedAt", "sheetDate", "snapshotId", "syncBatchId", "taxPercent") SELECT "accountingCode", "branchCode", "branchID", "changeType", "changedAt", "deltaType", "id", "isExternal", "isMainCombo", coalesce("mainAccountingCode", '') AS "mainAccountingCode", "newQuantity", "newSubTotal", "newTaxTotal", "newTotal", "oldQuantity", "oldSubTotal", "oldTaxTotal", "oldTotal", "processed", "processedAt", "sheetDate", "snapshotId", "syncBatchId", "taxPercent" FROM "sales_summary_deltas";
DROP TABLE "sales_summary_deltas";
ALTER TABLE "new_sales_summary_deltas" RENAME TO "sales_summary_deltas";
CREATE INDEX "sales_summary_deltas_sheetDate_processed_idx" ON "sales_summary_deltas"("sheetDate", "processed");
CREATE INDEX "sales_summary_deltas_changedAt_idx" ON "sales_summary_deltas"("changedAt");
CREATE INDEX "sales_summary_deltas_syncBatchId_idx" ON "sales_summary_deltas"("syncBatchId");
CREATE INDEX "sales_summary_deltas_processed_idx" ON "sales_summary_deltas"("processed");
CREATE INDEX "sales_summary_deltas_snapshotId_deltaType_idx" ON "sales_summary_deltas"("snapshotId", "deltaType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

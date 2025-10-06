-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sales_raw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderKey" TEXT NOT NULL,
    "transactionID" TEXT NOT NULL,
    "lineKey" INTEGER,
    "orderDateTime" DATETIME NOT NULL,
    "sheetDate" TEXT NOT NULL,
    "importDate" DATETIME NOT NULL,
    "menuItemID" TEXT,
    "menuItemText" TEXT NOT NULL,
    "mainAccountingCode" TEXT,
    "accountingCode" TEXT,
    "isMainCombo" BOOLEAN NOT NULL,
    "quantity" REAL NOT NULL,
    "extendedPrice" REAL NOT NULL,
    "taxPercent" REAL NOT NULL,
    "amountDue" REAL NOT NULL,
    "orderSubTotal" REAL NOT NULL,
    "orderStatus" INTEGER NOT NULL,
    "isInvoice" BOOLEAN NOT NULL,
    "headerDeleted" BOOLEAN NOT NULL,
    "transactionDeleted" BOOLEAN NOT NULL,
    "branchID" INTEGER NOT NULL,
    "branchCode" TEXT NOT NULL,
    "branchType" TEXT NOT NULL,
    "isExternal" BOOLEAN NOT NULL,
    "adjustedPrice" REAL NOT NULL,
    "lineSubTotal" REAL NOT NULL,
    "lineTaxTotal" REAL NOT NULL,
    "lineTotal" REAL NOT NULL,
    "orderHash" TEXT NOT NULL,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "syncBatchId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_sales_raw" ("accountingCode", "adjustedPrice", "amountDue", "branchCode", "branchID", "branchType", "createdAt", "extendedPrice", "headerDeleted", "id", "importDate", "isExternal", "isInvoice", "isLatest", "isMainCombo", "lineKey", "lineSubTotal", "lineTaxTotal", "lineTotal", "mainAccountingCode", "menuItemID", "menuItemText", "orderDateTime", "orderHash", "orderKey", "orderStatus", "orderSubTotal", "quantity", "sheetDate", "syncBatchId", "taxPercent", "transactionDeleted", "transactionID", "version") SELECT "accountingCode", "adjustedPrice", "amountDue", "branchCode", "branchID", "branchType", "createdAt", "extendedPrice", "headerDeleted", "id", "importDate", "isExternal", "isInvoice", "isLatest", "isMainCombo", "lineKey", "lineSubTotal", "lineTaxTotal", "lineTotal", "mainAccountingCode", "menuItemID", "menuItemText", "orderDateTime", "orderHash", "orderKey", "orderStatus", "orderSubTotal", "quantity", "sheetDate", "syncBatchId", "taxPercent", "transactionDeleted", "transactionID", "version" FROM "sales_raw";
DROP TABLE "sales_raw";
ALTER TABLE "new_sales_raw" RENAME TO "sales_raw";
CREATE INDEX "sales_raw_orderKey_isLatest_idx" ON "sales_raw"("orderKey", "isLatest");
CREATE INDEX "sales_raw_importDate_idx" ON "sales_raw"("importDate");
CREATE INDEX "sales_raw_sheetDate_idx" ON "sales_raw"("sheetDate");
CREATE INDEX "sales_raw_syncBatchId_idx" ON "sales_raw"("syncBatchId");
CREATE INDEX "sales_raw_branchCode_idx" ON "sales_raw"("branchCode");
CREATE INDEX "sales_raw_accountingCode_idx" ON "sales_raw"("accountingCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

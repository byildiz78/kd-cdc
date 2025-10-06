-- CreateTable
CREATE TABLE "sales_raw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderKey" TEXT NOT NULL,
    "transactionID" INTEGER NOT NULL,
    "lineKey" INTEGER,
    "orderDateTime" DATETIME NOT NULL,
    "sheetDate" TEXT NOT NULL,
    "importDate" DATETIME NOT NULL,
    "menuItemID" INTEGER,
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

-- CreateTable
CREATE TABLE "sales_summary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sheetDate" TEXT NOT NULL,
    "mainAccountingCode" TEXT,
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

-- CreateTable
CREATE TABLE "erp_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "snapshotDate" DATETIME NOT NULL,
    "dataStartDate" TEXT NOT NULL,
    "dataEndDate" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "deltaCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "erp_snapshots_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sales_summary_deltas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sheetDate" TEXT NOT NULL,
    "mainAccountingCode" TEXT,
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

-- CreateTable
CREATE TABLE "delta_affected_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deltaId" TEXT NOT NULL,
    "orderKey" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "orderDateTime" DATETIME NOT NULL,
    "importDate" DATETIME NOT NULL,
    "orderQuantity" REAL NOT NULL,
    "orderSubTotal" REAL NOT NULL,
    "orderTaxTotal" REAL NOT NULL,
    "orderTotal" REAL NOT NULL,
    "oldVersion" INTEGER,
    "newVersion" INTEGER NOT NULL,
    "oldHash" TEXT,
    "newHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delta_affected_orders_deltaId_fkey" FOREIGN KEY ("deltaId") REFERENCES "sales_summary_deltas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sales_change_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderKey" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "oldHash" TEXT,
    "newHash" TEXT NOT NULL,
    "oldVersion" INTEGER,
    "newVersion" INTEGER NOT NULL,
    "changedFields" TEXT,
    "syncBatchId" TEXT NOT NULL,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "sync_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "newRecords" INTEGER NOT NULL DEFAULT 0,
    "updatedRecords" INTEGER NOT NULL DEFAULT 0,
    "unchangedRecords" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "duration" INTEGER,
    "errorMessage" TEXT,
    "errorDetails" TEXT,
    CONSTRAINT "sync_batches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "sales_raw_orderKey_isLatest_idx" ON "sales_raw"("orderKey", "isLatest");

-- CreateIndex
CREATE INDEX "sales_raw_importDate_idx" ON "sales_raw"("importDate");

-- CreateIndex
CREATE INDEX "sales_raw_sheetDate_idx" ON "sales_raw"("sheetDate");

-- CreateIndex
CREATE INDEX "sales_raw_syncBatchId_idx" ON "sales_raw"("syncBatchId");

-- CreateIndex
CREATE INDEX "sales_raw_branchCode_idx" ON "sales_raw"("branchCode");

-- CreateIndex
CREATE INDEX "sales_raw_accountingCode_idx" ON "sales_raw"("accountingCode");

-- CreateIndex
CREATE INDEX "sales_summary_sheetDate_idx" ON "sales_summary"("sheetDate");

-- CreateIndex
CREATE INDEX "sales_summary_branchCode_idx" ON "sales_summary"("branchCode");

-- CreateIndex
CREATE INDEX "sales_summary_lastModified_idx" ON "sales_summary"("lastModified");

-- CreateIndex
CREATE UNIQUE INDEX "sales_summary_sheetDate_branchCode_accountingCode_isMainCombo_taxPercent_mainAccountingCode_key" ON "sales_summary"("sheetDate", "branchCode", "accountingCode", "isMainCombo", "taxPercent", "mainAccountingCode");

-- CreateIndex
CREATE INDEX "erp_snapshots_companyId_snapshotDate_idx" ON "erp_snapshots"("companyId", "snapshotDate");

-- CreateIndex
CREATE INDEX "erp_snapshots_createdAt_idx" ON "erp_snapshots"("createdAt");

-- CreateIndex
CREATE INDEX "sales_summary_deltas_sheetDate_processed_idx" ON "sales_summary_deltas"("sheetDate", "processed");

-- CreateIndex
CREATE INDEX "sales_summary_deltas_changedAt_idx" ON "sales_summary_deltas"("changedAt");

-- CreateIndex
CREATE INDEX "sales_summary_deltas_syncBatchId_idx" ON "sales_summary_deltas"("syncBatchId");

-- CreateIndex
CREATE INDEX "sales_summary_deltas_processed_idx" ON "sales_summary_deltas"("processed");

-- CreateIndex
CREATE INDEX "sales_summary_deltas_snapshotId_deltaType_idx" ON "sales_summary_deltas"("snapshotId", "deltaType");

-- CreateIndex
CREATE INDEX "delta_affected_orders_deltaId_idx" ON "delta_affected_orders"("deltaId");

-- CreateIndex
CREATE INDEX "delta_affected_orders_orderKey_idx" ON "delta_affected_orders"("orderKey");

-- CreateIndex
CREATE INDEX "delta_affected_orders_changeType_idx" ON "delta_affected_orders"("changeType");

-- CreateIndex
CREATE INDEX "sales_change_logs_orderKey_idx" ON "sales_change_logs"("orderKey");

-- CreateIndex
CREATE INDEX "sales_change_logs_syncBatchId_idx" ON "sales_change_logs"("syncBatchId");

-- CreateIndex
CREATE INDEX "sales_change_logs_detectedAt_idx" ON "sales_change_logs"("detectedAt");

-- CreateIndex
CREATE INDEX "sync_batches_companyId_startedAt_idx" ON "sync_batches"("companyId", "startedAt");

-- CreateIndex
CREATE INDEX "sync_batches_status_idx" ON "sync_batches"("status");

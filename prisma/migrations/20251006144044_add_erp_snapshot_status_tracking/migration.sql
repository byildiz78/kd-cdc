-- AlterTable
ALTER TABLE "erp_snapshots" ADD COLUMN "erpConfirmedAt" DATETIME;
ALTER TABLE "erp_snapshots" ADD COLUMN "erpDeltaCount" INTEGER;
ALTER TABLE "erp_snapshots" ADD COLUMN "erpErrorMessage" TEXT;
ALTER TABLE "erp_snapshots" ADD COLUMN "erpPulledAt" DATETIME;
ALTER TABLE "erp_snapshots" ADD COLUMN "erpRecordCount" INTEGER;
ALTER TABLE "erp_snapshots" ADD COLUMN "erpStatus" TEXT DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "erp_api_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "filters" TEXT,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "erp_api_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "erp_api_logs_companyId_requestedAt_idx" ON "erp_api_logs"("companyId", "requestedAt");

-- CreateIndex
CREATE INDEX "erp_api_logs_endpoint_idx" ON "erp_api_logs"("endpoint");

-- CreateIndex
CREATE INDEX "erp_snapshots_erpStatus_idx" ON "erp_snapshots"("erpStatus");

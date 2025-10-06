# SQL Server → SQLite Sync System - Roadmap

## Genel Bakış

SQL Server'daki sürekli güncellenen satış verilerini SQLite'a senkronize eden, **snapshot-based delta tracking** ile değişiklikleri takip eden ve ERP sistemlerine güvenilir veri servisi sağlayan bir sistem kurulacak.

### Snapshot-Based Delta Mekanizması

**Problem**: ERP günde bir kez veri çeker. ERP çekmeden önce olan değişiklikler direkt aggregation'a yansımalı, ERP çektikten sonra olan değişiklikler delta olarak kaydedilmeli.

**Çözüm**:
- ERP her veri çektiğinde **snapshot** oluşturulur
- Snapshot öncesi değişiklikler → Summary'ye direkt yansır (delta oluşmaz)
- Snapshot sonrası değişiklikler → Delta'ya kaydedilir
- ERP bir sonraki çekişinde delta'ları alır ve işlenmiş olarak işaretler

---

## Faz 1: Database Schema ve Modeller

### 1.1 Prisma Schema Güncellemeleri

**Dosya:** `prisma/schema.prisma`

#### Model 1: SalesRaw (Ham Veri Tablosu)

```prisma
model SalesRaw {
  id              String   @id @default(uuid())

  // Primary identifiers
  orderKey        String
  transactionID   Int      // TransactionKey
  lineKey         Int?

  // Date fields
  orderDateTime   DateTime
  sheetDate       String   // YYYY-MM-DD format
  importDate      DateTime // SQL Server ImportDate (change detection için kritik)

  // Transaction details
  menuItemID           Int?     // MenuItemKey
  menuItemText         String
  mainAccountingCode   String?
  accountingCode       String?
  isMainCombo          Boolean
  quantity             Float
  extendedPrice        Float
  taxPercent           Float

  // Header fields (her transaction satırında tekrar eder)
  amountDue            Float
  orderSubTotal        Float
  orderStatus          Int
  isInvoice            Boolean
  headerDeleted        Boolean
  transactionDeleted   Boolean

  // Branch information
  branchID             Int
  branchCode           String
  branchType           String
  isExternal           Boolean

  // Calculated fields (SQL Server'dan hazır gelir)
  adjustedPrice        Float
  lineSubTotal         Float
  lineTaxTotal         Float
  lineTotal            Float

  // Version control & change detection
  orderHash            String    // OrderKey bazında hesaplanan SHA-256 hash
  isLatest             Boolean   @default(true)
  version              Int       @default(1)
  syncBatchId          String    // Hangi sync batch'inde geldi

  // Timestamps
  createdAt            DateTime  @default(now())

  @@index([orderKey, isLatest])
  @@index([importDate])
  @@index([sheetDate])
  @@index([syncBatchId])
  @@index([branchCode])
  @@index([accountingCode])
}
```

#### Model 2: SalesSummary (Agregasyon Tablosu)

```prisma
model SalesSummary {
  id                  String   @id @default(uuid())

  // Group by keys
  sheetDate           String
  mainAccountingCode  String?
  accountingCode      String
  isMainCombo         Boolean
  taxPercent          Float
  branchID            Int
  branchCode          String
  isExternal          Boolean

  // Aggregated values
  quantity            Float
  subTotal            Float
  taxTotal            Float
  total               Float

  // Metadata
  version             Int      @default(1)
  dataHash            String   // Bu summary'nin hash'i
  lastModified        DateTime @default(now())
  lastSyncBatchId     String

  createdAt           DateTime @default(now())

  @@unique([sheetDate, branchCode, accountingCode, isMainCombo, taxPercent, mainAccountingCode])
  @@index([sheetDate])
  @@index([branchCode])
  @@index([lastModified])
}
```

#### Model 3: ERPSnapshot (ERP Çekiş Kayıtları) ⭐ YENİ

```prisma
model ERPSnapshot {
  id              String   @id @default(uuid())

  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])

  // ERP hangi zamana kadar veri çekti
  snapshotDate    DateTime

  // Hangi tarih aralığını kapsıyor
  dataStartDate   String
  dataEndDate     String

  // Metadata
  recordCount     Int      // Kaç summary kaydı çekildi
  deltaCount      Int      @default(0) // Kaç delta işlendi

  createdAt       DateTime @default(now())

  // Relations
  deltas          SalesSummaryDelta[]

  @@index([companyId, snapshotDate])
  @@index([createdAt])
}
```

#### Model 4: SalesSummaryDelta (Değişiklik Kayıtları)

```prisma
model SalesSummaryDelta {
  id                  String   @id @default(uuid())

  // Summary keys
  sheetDate           String
  mainAccountingCode  String?
  accountingCode      String
  isMainCombo         Boolean
  taxPercent          Float
  branchID            Int
  branchCode          String
  isExternal          Boolean

  // Change tracking
  changeType          String   // 'INSERT' | 'UPDATE' | 'DELETE'

  // Old values (null if INSERT)
  oldQuantity         Float?
  oldSubTotal         Float?
  oldTaxTotal         Float?
  oldTotal            Float?

  // New values (null if DELETE)
  newQuantity         Float?
  newSubTotal         Float?
  newTaxTotal         Float?
  newTotal            Float?

  // Metadata
  changedAt           DateTime @default(now())
  syncBatchId         String
  processed           Boolean  @default(false)
  processedAt         DateTime?

  // ⭐ Snapshot tracking (YENİ)
  snapshotId          String?
  snapshot            ERPSnapshot? @relation(fields: [snapshotId], references: [id])
  deltaType           String   // 'PRE_SNAPSHOT' | 'POST_SNAPSHOT'

  // Relations
  affectedOrders      DeltaAffectedOrder[]

  @@index([sheetDate, processed])
  @@index([changedAt])
  @@index([syncBatchId])
  @@index([processed])
  @@index([snapshotId, deltaType])
}
```

#### Model 5: DeltaAffectedOrder (Delta'ya Sebep Olan Order'lar)

```prisma
model DeltaAffectedOrder {
  id              String   @id @default(uuid())

  // Relation
  deltaId         String
  delta           SalesSummaryDelta @relation(fields: [deltaId], references: [id], onDelete: Cascade)

  // Order identifiers
  orderKey        String
  changeType      String   // 'CREATED' | 'UPDATED' | 'REIMPORTED' | 'DELETED'

  // Order details
  orderDateTime   DateTime
  importDate      DateTime

  // Bu order'ın bu summary grubuna katkısı
  orderQuantity   Float
  orderSubTotal   Float
  orderTaxTotal   Float
  orderTotal      Float

  // Version tracking
  oldVersion      Int?
  newVersion      Int
  oldHash         String?
  newHash         String

  createdAt       DateTime @default(now())

  @@index([deltaId])
  @@index([orderKey])
  @@index([changeType])
}
```

#### Model 6: SalesChangeLog (Audit Trail)

```prisma
model SalesChangeLog {
  id              String   @id @default(uuid())

  orderKey        String
  changeType      String   // 'CREATED' | 'UPDATED' | 'REIMPORTED' | 'DELETED'

  // Change details
  oldHash         String?
  newHash         String
  oldVersion      Int?
  newVersion      Int

  // Changed fields (JSON)
  changedFields   String?  // JSON string: {"quantity": {"old": 5, "new": 7}}

  // Metadata
  syncBatchId     String
  detectedAt      DateTime @default(now())

  @@index([orderKey])
  @@index([syncBatchId])
  @@index([detectedAt])
}
```

#### Model 7: SyncBatch (Sync İşlem Kayıtları)

```prisma
model SyncBatch {
  id              String   @id @default(uuid())

  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])

  startDate       String   // Sync date range
  endDate         String

  status          String   // 'RUNNING' | 'COMPLETED' | 'FAILED'

  // Statistics
  totalRecords    Int      @default(0)
  newRecords      Int      @default(0)
  updatedRecords  Int      @default(0)
  unchangedRecords Int     @default(0)

  // Timing
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  duration        Int?     // milliseconds

  // Error tracking
  errorMessage    String?
  errorDetails    String?  // JSON

  @@index([companyId, startedAt])
  @@index([status])
}
```

#### Model 8: Company Güncellemesi

```prisma
model Company {
  id          String        @id @default(uuid())
  name        String
  code        String        @unique
  apiUrl      String
  apiToken    String        // Encrypted
  isActive    Boolean       @default(true)

  users       User[]
  syncBatches SyncBatch[]
  erpSnapshots ERPSnapshot[] // ⭐ YENİ

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}
```

### 1.2 Migration

```bash
npx prisma migrate dev --name add_sales_sync_with_snapshots
npx prisma generate
```

---

## Faz 2: SQL Query Tanımlaması

### 2.1 Database'e Raw Data Query Ekleme

**Dosya:** `prisma/seed.ts` - Query ekleme

Sales raw data query'sini `sales-raw` code ile ekle (SQL içeriği ROADMAP'in önceki versiyonunda var).

```bash
npx tsx prisma/seed.ts
```

---

## Faz 3: Service Layer Oluşturma

### 3.1 Hash Service

**Dosya:** `lib/services/hash.service.ts` (<300 satır)

- `calculateOrderHash()` - OrderKey bazında hash hesaplama
- `calculateSummaryHash()` - Summary hash hesaplama
- `hasChanged()` - Hash karşılaştırma

### 3.2 Grouping Service

**Dosya:** `lib/services/grouping.service.ts` (<300 satır)

- `groupByOrderKey()` - Raw data'yı OrderKey'e göre grupla
- `generateSummaryKey()` - Summary key oluştur
- `groupBySummaryKey()` - Summary key'e göre grupla
- `calculateSummaryFromGroup()` - Grup toplamları hesapla

### 3.3 Sync Service (Core Logic)

**Dosya:** `lib/services/sync.service.ts` (modüler tutulacak, >300 satır ise bölünecek)

**Ana fonksiyonlar:**
- `syncSalesData()` - Ana sync fonksiyonu
- `processOrderKey()` - OrderKey bazında işleme
- `updateSummaries()` - Summary tablosunu güncelle
- `createDeltaRecords()` - ⭐ Snapshot-aware delta oluştur

**⭐ Snapshot Logic (createDeltaRecords içinde):**

```typescript
async function createDeltaRecords(syncBatchId: string, companyId: string) {
  // Son ERP snapshot'ı bul
  const lastSnapshot = await prisma.eRPSnapshot.findFirst({
    where: { companyId },
    orderBy: { snapshotDate: 'desc' }
  });

  // Her delta için:
  const isPreSnapshot = !lastSnapshot ||
    changeDate <= lastSnapshot.snapshotDate;

  if (isPreSnapshot) {
    // PRE_SNAPSHOT: Delta oluşturma, sadece summary'yi güncelle
    console.log('Pre-snapshot change, merged into summary');
    continue;
  }

  // POST_SNAPSHOT: Delta oluştur
  await prisma.salesSummaryDelta.create({
    data: {
      // ... delta fields ...
      snapshotId: lastSnapshot.id,
      deltaType: 'POST_SNAPSHOT'
    }
  });
}
```

### 3.4 Scheduler Service

**Dosya:** `lib/services/scheduler.service.ts` (<300 satır)

- `runDailySyncForAllCompanies()` - Günlük sync
- `runWeeklySyncForAllCompanies()` - Haftalık sync (re-import detection)

---

## Faz 4: API Endpoints

### 4.1 Sync Endpoints (SuperAdmin)

**Dosya:** `app/api/sync/route.ts` (<150 satır)
- POST `/api/sync` - Manuel sync tetikle

**Dosya:** `app/api/sync/history/route.ts` (<100 satır)
- GET `/api/sync/history` - Sync geçmişi

### 4.2 Summary Endpoint (ERP için)

**Dosya:** `app/api/sales/summary/route.ts` (<100 satır)
- GET `/api/sales/summary?startDate=X&endDate=Y`
- Summary verilerini getir (full sync için)

### 4.3 Delta Endpoints (ERP için)

**Dosya:** `app/api/sales/delta/route.ts` (<150 satır)
- GET `/api/sales/delta?processed=false`
- POST_SNAPSHOT delta'ları getir (processed=false olanlar)

**Dosya:** `app/api/sales/delta/[id]/route.ts` (<150 satır)
- GET `/api/sales/delta/{id}`
- Delta detayı + affected orders

**Dosya:** `app/api/sales/delta/mark-processed/route.ts` (<100 satır) ⭐
- POST `/api/sales/delta/mark-processed`
- Delta'ları işlenmiş işaretle VE snapshot oluştur

**⭐ Snapshot Oluşturma Logic:**

```typescript
export async function POST(request: NextRequest) {
  const { deltaIds, startDate, endDate, companyId } = await request.json();

  // 1. Snapshot oluştur
  const snapshot = await prisma.eRPSnapshot.create({
    data: {
      companyId,
      snapshotDate: new Date(),
      dataStartDate: startDate,
      dataEndDate: endDate,
      deltaCount: deltaIds.length
    }
  });

  // 2. Delta'ları processed=true yap ve snapshot'a bağla
  await prisma.salesSummaryDelta.updateMany({
    where: { id: { in: deltaIds } },
    data: {
      processed: true,
      processedAt: new Date(),
      snapshotId: snapshot.id
    }
  });

  return NextResponse.json({ snapshotId: snapshot.id });
}
```

### 4.4 Cron Endpoints

**Dosya:** `app/api/cron/daily-sync/route.ts` (<100 satır)
- GET `/api/cron/daily-sync`
- Her gün 02:00'da çalışır

**Dosya:** `app/api/cron/weekly-sync/route.ts` (<100 satır)
- GET `/api/cron/weekly-sync`
- Her Pazar 03:00'da çalışır

---

## Faz 5: Scheduler Setup

### 5.1 Vercel Cron Configuration

**Dosya:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-sync",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/weekly-sync",
      "schedule": "0 3 * * 0"
    }
  ]
}
```

### 5.2 Environment Variables

**Dosya:** `.env`

```env
# Existing
DATABASE_URL="file:./dev.db"
ENCRYPTION_KEY="your-32-character-encryption-key"

# Cron security
CRON_SECRET="your-random-cron-secret-key-here"
```

---

## Faz 6: Frontend UI (Opsiyonel - Monitoring)

### 6.1 Sync Management Page

**Dosya:** `app/settings/sync/page.tsx` (<300 satır)
- Sync geçmişi tablosu
- Manuel sync trigger butonu
- Batch durumları (RUNNING, COMPLETED, FAILED)

### 6.2 Sidebar Güncelleme

**Dosya:** `components/Sidebar.tsx`
- Ayarlar → Senkronizasyon linki ekle

---

## Faz 7: Testing & Validation

### 7.1 Test Script

**Dosya:** `scripts/test-sync.ts`

Test senaryoları:
1. İlk sync (tüm kayıtlar NEW)
2. Update detection (hash değişikliği)
3. Re-import detection (ImportDate değişikliği)
4. Summary accuracy (raw toplamı = summary toplamı)
5. Delta processing (ERP simülasyonu)

---

## ERP Entegrasyon Akışı

### Senaryo 1: İlk Kurulum (Full Sync)

```typescript
// ERP - İlk kurulum
async function initialSync() {
  // 1. Tüm summary'leri çek
  const summaries = await fetch(
    '/api/sales/summary?startDate=2024-01-01&endDate=2025-01-31'
  );

  // 2. ERP'ye aktar
  for (const summary of summaries.json()) {
    await insertIntoERP(summary);
  }

  // 3. İlk snapshot oluştur
  await fetch('/api/sales/delta/mark-processed', {
    method: 'POST',
    body: JSON.stringify({
      deltaIds: [], // İlk kurulum
      startDate: '2024-01-01',
      endDate: '2025-01-31',
      companyId: 'xxx'
    })
  });
}
```

### Senaryo 2: Günlük Delta Sync

```typescript
// ERP - Günlük job (her gün 14:00)
async function dailyDeltaSync() {
  // 1. Sadece delta'ları çek
  const deltas = await fetch('/api/sales/delta?processed=false');

  if (deltas.length === 0) return;

  const processedIds = [];

  // 2. Her delta'yı ERP'ye uygula
  for (const delta of deltas) {
    await upsertIntoERP({
      sheetDate: delta.sheetDate,
      branchCode: delta.branchCode,
      accountingCode: delta.accountingCode,
      quantity: delta.newQuantity,
      subTotal: delta.newSubTotal,
      taxTotal: delta.newTaxTotal,
      total: delta.newTotal
    });

    processedIds.push(delta.id);
  }

  // 3. İşlenen delta'ları işaretle (snapshot oluşturulur)
  await fetch('/api/sales/delta/mark-processed', {
    method: 'POST',
    body: JSON.stringify({
      deltaIds: processedIds,
      startDate: today,
      endDate: today,
      companyId: 'xxx'
    })
  });
}
```

---

## Timeline Örneği (Snapshot Bazlı)

```
Gün 1
------
08:00 - Sync #1 → OrderKey-1 (qty: 10) → SalesRaw + SalesSummary
        ❌ Henüz snapshot yok, delta oluşmaz

10:00 - Sync #2 → OrderKey-1 UPDATED (qty: 12)
        ❌ PRE_SNAPSHOT (snapshot olmadan değişiklik)
        ✅ SalesSummary güncellenir (12)
        ❌ Delta oluşmaz

14:00 - ✅ ERP veri çeker
        GET /api/sales/summary
        Alır: [{..., quantity: 12}]

        POST /api/sales/delta/mark-processed
        → Snapshot #1 oluşur ⭐

15:00 - Sync #3 → OrderKey-1 UPDATED (qty: 15)
        ✅ POST_SNAPSHOT (Snapshot #1'den sonra)
        ✅ SalesSummary güncellenir (15)
        ✅ Delta oluşur (snapshot_1'e bağlı)

16:00 - Sync #4 → OrderKey-2 NEW (qty: 5)
        ✅ POST_SNAPSHOT delta oluşur

Gün 2
------
14:00 - ✅ ERP delta çeker
        GET /api/sales/delta?processed=false
        Alır: [
          {OrderKey-1: 12→15},
          {OrderKey-2: new→5}
        ]

        POST /api/sales/delta/mark-processed
        → Snapshot #2 oluşur ⭐
        → Delta'lar processed=true
```

---

## Özet: Implementation Checklist

### ✅ Faz 1: Database
- [ ] Prisma schema'ya ERPSnapshot + güncellemeler ekle
- [ ] Migration çalıştır
- [ ] Seed güncelle (sales-raw query)

### ✅ Faz 2: Service Layer
- [ ] hash.service.ts (<300 satır)
- [ ] grouping.service.ts (<300 satır)
- [ ] sync.service.ts (snapshot-aware delta logic)
- [ ] scheduler.service.ts (<300 satır)

### ✅ Faz 3: API Endpoints
- [ ] /api/sync (POST) - Manuel sync
- [ ] /api/sync/history (GET) - Geçmiş
- [ ] /api/sales/summary (GET) - Full data (ERP)
- [ ] /api/sales/delta (GET) - Delta listesi (ERP)
- [ ] /api/sales/delta/[id] (GET) - Delta detay
- [ ] /api/sales/delta/mark-processed (POST) - Snapshot oluştur ⭐
- [ ] /api/cron/daily-sync (GET)
- [ ] /api/cron/weekly-sync (GET)

### ✅ Faz 4: Scheduler
- [ ] vercel.json cron config
- [ ] .env CRON_SECRET

### ✅ Faz 5: UI (Opsiyonel)
- [ ] /settings/sync sayfası (<300 satır)
- [ ] Sidebar güncelleme

### ✅ Faz 6: Testing
- [ ] Test script
- [ ] Test senaryoları

---

## Endpoint Özeti (ERP için)

| Endpoint | Method | Kullanım | Ne Zaman |
|----------|--------|----------|----------|
| `/api/sales/summary` | GET | Tam veri çek | İlk kurulum / Full sync |
| `/api/sales/delta` | GET | POST_SNAPSHOT delta'ları çek | Günlük sync |
| `/api/sales/delta/mark-processed` | POST | Delta'ları işaretle + Snapshot oluştur | Delta çektikten sonra |

## Avantajlar

1. ✅ **Pre-snapshot değişiklikler** → Summary'de, delta yok
2. ✅ **Post-snapshot değişiklikler** → Delta'da kayıtlı
3. ✅ **Otomatik snapshot** → ERP mark-processed çağrısıyla oluşur
4. ✅ **Basit ERP entegrasyonu** → 2 GET + 1 POST endpoint
5. ✅ **Audit trail** → Hangi snapshot'ta ne çekildi izlenebilir
6. ✅ **Idempotent** → Aynı delta tekrar çekilemez

---

## Notlar

1. **Modüler kod**: Her dosya <300 satır
2. **Performance**: Büyük data için batch processing eklenebilir
3. **Monitoring**: Error tracking önerilir
4. **Backup**: SQLite düzenli yedeklenmeli
5. **Rate Limiting**: RobotPos API dikkatli kullanılmalı

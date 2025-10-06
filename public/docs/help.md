# Developer Notes - Sistem Dokümantasyonu

## İçindekiler
1. [Genel Mimari](#genel-mimari)
2. [Veri Akışı](#veri-akışı)
3. [RobotPOS API Entegrasyonu](#robotpos-api-entegrasyonu)
4. [Senkronizasyon Süreci](#senkronizasyon-süreci)
5. [Delta (Değişiklik) Yönetimi](#delta-değişiklik-yönetimi)
6. [Hash-Based Change Detection](#hash-based-change-detection)
7. [ERP API Entegrasyonu](#erp-api-entegrasyonu)
8. [Veritabanı Yapısı](#veritabanı-yapısı)

---

## Genel Mimari

Bu sistem, RobotPOS'tan satış verilerini çeken, değişiklikleri takip eden ve ERP sistemlerine sunan bir **veri senkronizasyon platformu**dur.

### Temel Bileşenler:
- **Frontend**: Next.js 13 App Router + React
- **Backend**: Next.js API Routes
- **Database**: SQLite (Prisma ORM)
- **Authentication**: Cookie-based session + Bearer token (ERP)
- **Scheduling**: Cron jobs (günlük/haftalık)

### Mimari Katmanlar:
```
┌─────────────────────────────────────────────┐
│  RobotPOS SQL Server (Kaynak Sistem)       │
└─────────────────┬───────────────────────────┘
                  │ SQL Queries
                  ▼
┌─────────────────────────────────────────────┐
│  Sync Service (lib/services/sync.service)  │
│  - Veri çekme                               │
│  - Hash hesaplama                           │
│  - Değişiklik tespiti                       │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  SQLite Database                            │
│  - SalesRaw (ham veri + versiyonlar)       │
│  - SalesSummary (özet)                      │
│  - SalesSummaryDelta (değişiklikler)       │
│  - SalesChangeLog (log)                     │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  ERP API (Bearer Token Auth)               │
│  - /api/erp/sales-summary                   │
│  - /api/erp/deltas                          │
└─────────────────────────────────────────────┘
```

---

## Veri Akışı

### 1. Veri Toplama Süreci
```
RobotPOS SQL Server
    ↓ (SQL Query)
Raw Sales Data (transactions)
    ↓ (Group by OrderKey)
OrderKey Groups
    ↓ (Calculate Hash)
Hashed Order Data
    ↓ (Compare with existing)
Change Detection
    ↓ (Store versions)
SalesRaw Table
```

### 2. Veri Dönüşümü
```
SalesRaw (transaction level)
    ↓ (Aggregate)
SalesSummary (accounting code + branch + date level)
    ↓ (Compare versions)
SalesSummaryDelta (changes only)
```

---

## RobotPOS API Entegrasyonu

### API Bağlantı Bilgileri
Her firma için ayrı API konfigürasyonu tutulur:

```typescript
// Company model
{
  apiUrl: "https://example.robotpos.com/realtimeapi/api/1/query",
  apiToken: "encrypted_token", // AES-256-GCM ile şifrelenmiş
  isActive: true
}
```

### Veri Çekme Süreci

#### 1. Query Hazırlama
```typescript
// lib/services/sync.service.ts - executeSync()

const query = await prisma.query.findUnique({
  where: { code: 'SALES_RAW_DATA' }
});

const sqlQuery = query.sqlContent
  .replace(/@StartDate/g, startDate)
  .replace(/@EndDate/g, endDate);
```

#### 2. RobotPOS API Çağrısı
```typescript
const response = await fetch(company.apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${decryptedToken}`
  },
  body: JSON.stringify({
    query: sqlQuery,
    parameters: {
      StartDate: startDate,
      EndDate: endDate
    }
  })
});

const rawData = await response.json();
```

#### 3. Veri Validasyonu
```typescript
// Gelen veri yapısı:
[
  {
    OrderKey: "uuid",
    TransactionID: "string",
    LineKey: number,
    OrderDateTime: "datetime",
    SheetDate: "YYYY-MM-DD",
    MenuItemText: "string",
    AccountingCode: "100.01.001",
    Quantity: 1.0,
    ExtendedPrice: 100.50,
    // ... diğer alanlar
  }
]
```

---

## Senkronizasyon Süreci

### Adım 1: Veri Gruplama (Group by OrderKey)

Her sipariş (OrderKey), birden fazla transaction içerebilir. Önce OrderKey bazında gruplanır:

```typescript
// lib/services/sync.service.ts - groupByOrderKey()

function groupByOrderKey(data: RawSalesData[]) {
  const grouped: Record<string, RawSalesData[]> = {};

  data.forEach(row => {
    if (!grouped[row.OrderKey]) {
      grouped[row.OrderKey] = [];
    }
    grouped[row.OrderKey].push(row);
  });

  return grouped;
}
```

### Adım 2: Hash Hesaplama

Her OrderKey için tüm transaction'ların birleştirilmiş hash'i hesaplanır:

```typescript
// lib/services/sync.service.ts - calculateOrderHash()

function calculateOrderHash(transactions: RawSalesData[]): string {
  // Transaction'ları LineKey'e göre sırala (tutarlılık için)
  const sorted = transactions.sort((a, b) =>
    (a.LineKey || 0) - (b.LineKey || 0)
  );

  // Hash'e dahil edilecek alanlar
  const hashableFields = sorted.map(tx => ({
    TransactionID: tx.TransactionID,
    LineKey: tx.LineKey,
    MenuItemText: tx.MenuItemText,
    AccountingCode: tx.AccountingCode,
    Quantity: tx.Quantity,
    ExtendedPrice: tx.ExtendedPrice,
    TaxPercent: tx.TaxPercent,
    // ... diğer kritik alanlar
  }));

  // SHA-256 hash
  const hashInput = JSON.stringify(hashableFields);
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}
```

### Adım 3: Değişiklik Tespiti

Mevcut hash ile yeni hash karşılaştırılır:

```typescript
// lib/services/sync.service.ts - detectChanges()

const existingOrder = await prisma.salesRaw.findFirst({
  where: {
    orderKey: orderKey,
    isLatest: true
  }
});

if (!existingOrder) {
  // YENİ KAYIT
  changeType = 'NEW';
  version = 1;
} else if (existingOrder.orderHash !== newHash) {
  // GÜNCELLEME
  changeType = 'UPDATED';
  version = existingOrder.version + 1;

  // Eski versiyonu isLatest=false yap
  await prisma.salesRaw.updateMany({
    where: { orderKey: orderKey },
    data: { isLatest: false }
  });
} else {
  // DEĞİŞİKLİK YOK
  changeType = 'UNCHANGED';
}
```

### Adım 4: Veri Kaydetme

```typescript
// SalesRaw tablosuna kaydet
await prisma.salesRaw.createMany({
  data: transactions.map(tx => ({
    ...tx,
    orderHash: newHash,
    isLatest: true,
    version: version,
    syncBatchId: batchId
  }))
});

// Change log kaydet
if (changeType !== 'UNCHANGED') {
  await prisma.salesChangeLog.create({
    data: {
      orderKey: orderKey,
      changeType: changeType,
      oldHash: existingOrder?.orderHash || null,
      newHash: newHash,
      oldVersion: existingOrder?.version || null,
      newVersion: version,
      syncBatchId: batchId,
      orderSnapshot: JSON.stringify(transactions)
    }
  });
}
```

---

## Delta (Değişiklik) Yönetimi

### Delta Nedir?

Delta, **SalesSummary** seviyesindeki değişikliklerdir. Ham veri (SalesRaw) transaction bazındadır, ancak deltalar **özet** (summary) bazındadır.

### Summary Hesaplama

```typescript
// Gruplama anahtarı:
{
  sheetDate: "2025-10-01",
  branchCode: "001",
  accountingCode: "100.01.001",
  isMainCombo: false,
  taxPercent: 20,
  mainAccountingCode: "100.01",
  isExternal: false
}

// Toplanan değerler:
{
  quantity: SUM(quantity),
  subTotal: SUM(lineSubTotal),
  taxTotal: SUM(lineTaxTotal),
  total: SUM(lineTotal)
}
```

### Delta Oluşturma Koşulları

Delta'lar şu durumlarda oluşturulur:

1. **YENİ KAYIT (NEW)**:
   - SalesSummary'de daha önce yoksa
   - `changeType = 'NEW'`
   - `oldQuantity = null`, `newQuantity = current`

2. **ARTIŞ (INCREASED)**:
   - Quantity, SubTotal veya Total artmışsa
   - `changeType = 'INCREASED'`
   - `oldQuantity < newQuantity`

3. **AZALIŞ (DECREASED)**:
   - Quantity, SubTotal veya Total azalmışsa
   - `changeType = 'DECREASED'`
   - `oldQuantity > newQuantity`

4. **SİLİNME (DELETED)**:
   - Önceki snapshot'ta vardı ama yeni snapshot'ta yoksa
   - `changeType = 'DELETED'`
   - `newQuantity = null`, `oldQuantity = previous`

### Delta Hesaplama Örneği

```typescript
// Önceki durum (SalesSummary)
{
  sheetDate: "2025-10-01",
  branchCode: "001",
  accountingCode: "100.01.001",
  quantity: 10,
  subTotal: 1000,
  taxTotal: 200,
  total: 1200
}

// Yeni sync sonrası
{
  quantity: 15,  // +5 artış
  subTotal: 1500,
  taxTotal: 300,
  total: 1800
}

// Delta kaydı:
{
  changeType: 'INCREASED',
  oldQuantity: 10,
  newQuantity: 15,
  oldSubTotal: 1000,
  newSubTotal: 1500,
  oldTaxTotal: 200,
  newTaxTotal: 300,
  oldTotal: 1200,
  newTotal: 1800,
  deltaType: 'POST_SNAPSHOT',
  snapshotId: 'snapshot-uuid'
}
```

### PRE_SNAPSHOT vs POST_SNAPSHOT

- **PRE_SNAPSHOT**: Snapshot alınmadan **önce** değişiklikler (anlık deltaları ERP'ye push için)
- **POST_SNAPSHOT**: Snapshot alındıktan **sonra** değişiklikler (tarihsel kayıt için)

```typescript
// Snapshot oluşturma
const snapshot = await prisma.eRPSnapshot.create({
  data: {
    companyId: company.id,
    snapshotDate: new Date(),
    dataStartDate: startDate,
    dataEndDate: endDate,
    recordCount: summaryData.length,
    deltaCount: deltas.length
  }
});

// Delta'ları snapshot'a bağla
await prisma.salesSummaryDelta.updateMany({
  where: { id: { in: deltaIds } },
  data: {
    snapshotId: snapshot.id,
    deltaType: 'POST_SNAPSHOT'
  }
});
```

---

## Hash-Based Change Detection

### Neden Hash Kullanılıyor?

1. **Performans**: Tüm alanları tek tek karşılaştırmak yerine tek bir string karşılaştırması
2. **Versiyon Yönetimi**: Her değişiklikte yeni hash, eski versiyon korunur
3. **Bütünlük Kontrolü**: Herhangi bir alanda değişiklik olursa hash değişir

### Hash Algoritması: SHA-256

```typescript
import crypto from 'crypto';

function calculateHash(data: any): string {
  const hashInput = JSON.stringify(data);
  return crypto.createHash('sha256')
    .update(hashInput)
    .digest('hex');
}
```

### Hash'e Dahil Edilen Alanlar

```typescript
const hashableFields = {
  // Transaction bilgileri
  TransactionID: tx.TransactionID,
  LineKey: tx.LineKey,

  // Ürün bilgileri
  MenuItemID: tx.MenuItemID,
  MenuItemText: tx.MenuItemText,
  AccountingCode: tx.AccountingCode,
  MainAccountingCode: tx.MainAccountingCode,
  IsMainCombo: tx.IsMainCombo,

  // Fiyat bilgileri
  Quantity: tx.Quantity,
  ExtendedPrice: tx.ExtendedPrice,
  TaxPercent: tx.TaxPercent,

  // Hesaplanan tutarlar
  AdjustedPrice: tx.AdjustedPrice,
  LineSubTotal: tx.LineSubTotal,
  LineTaxTotal: tx.LineTaxTotal,
  LineTotal: tx.LineTotal,

  // Header bilgileri
  AmountDue: tx.AmountDue,
  OrderSubTotal: tx.OrderSubTotal,
  OrderStatus: tx.OrderStatus,
  IsInvoice: tx.IsInvoice,
  HeaderDeleted: tx.HeaderDeleted,
  TransactionDeleted: tx.TransactionDeleted
};
```

### Versiyon Yönetimi

```typescript
// SalesRaw tablosunda versiyon takibi
{
  orderKey: "uuid-123",
  version: 1,      // İlk kayıt
  isLatest: true,
  orderHash: "abc123..."
}

// Güncelleme geldiğinde
{
  orderKey: "uuid-123",
  version: 1,
  isLatest: false,  // Eski versiyon artık latest değil
  orderHash: "abc123..."
}
{
  orderKey: "uuid-123",
  version: 2,       // Yeni versiyon
  isLatest: true,
  orderHash: "def456..."
}
```

---

## ERP API Entegrasyonu

### Authentication: Bearer Token

Her firma için unique bir `erpApiToken` oluşturulur (UUID):

```typescript
// Company edit formunda
const newToken = crypto.randomUUID();
// Örnek: "a01818e0-8d19-44a9-a796-b1fd0f89d371"

// Token düz metin olarak saklanır (encrypted değil)
await prisma.company.update({
  where: { id: companyId },
  data: { erpApiToken: newToken }
});
```

### ERP Token Doğrulama

```typescript
// lib/auth/erp-auth.ts - verifyERPToken()

export async function verifyERPToken(request: NextRequest) {
  // Authorization header'ı oku
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { success: false, error: 'Missing Authorization header' };
  }

  // "Bearer <token>" formatı kontrol et
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return { success: false, error: 'Invalid Authorization format' };
  }

  // Token'ı veritabanında ara
  const company = await prisma.company.findFirst({
    where: {
      erpApiToken: token,
      isActive: true
    }
  });

  if (!company) {
    return { success: false, error: 'Invalid or inactive token' };
  }

  return {
    success: true,
    company: { id: company.id, name: company.name, code: company.code }
  };
}
```

### Endpoint 1: Sales Summary

**Endpoint**: `GET /api/erp/sales-summary`

**Amaç**: Belirli tarih aralığındaki özet satış verilerini döner.

**Örnek İstek**:
```bash
curl --location 'http://localhost:3000/api/erp/sales-summary?startDate=2025-10-01&endDate=2025-10-31&branchCode=001' \
--header 'Authorization: Bearer a01818e0-8d19-44a9-a796-b1fd0f89d371'
```

**Response**:
```json
{
  "success": true,
  "company": {
    "code": "KD",
    "name": "Kahve Dünyası"
  },
  "data": {
    "dateRange": {
      "startDate": "2025-10-01",
      "endDate": "2025-10-31"
    },
    "filters": {
      "branchCode": "001",
      "accountingCode": null
    },
    "totals": {
      "totalQuantity": 1250,
      "totalSubTotal": 125000.50,
      "totalTaxTotal": 25000.10,
      "totalAmount": 150000.60
    },
    "records": [
      {
        "sheetDate": "2025-10-01",
        "branchCode": "001",
        "accountingCode": "100.01.001",
        "quantity": 50,
        "subTotal": 5000,
        "taxTotal": 1000,
        "total": 6000
      }
    ]
  }
}
```

### Endpoint 2: Deltas

**Endpoint**: `GET /api/erp/deltas`

**Amaç**: Sadece değişen kayıtları (delta) döner.

**Örnek İstek**:
```bash
curl --location 'http://localhost:3000/api/erp/deltas?startDate=2025-10-01&endDate=2025-10-31&changeType=INCREASED' \
--header 'Authorization: Bearer a01818e0-8d19-44a9-a796-b1fd0f89d371'
```

**Response**:
```json
{
  "success": true,
  "company": {
    "code": "KD",
    "name": "Kahve Dünyası"
  },
  "data": {
    "deltaType": "POST_SNAPSHOT",
    "statistics": {
      "totalDeltas": 45,
      "byChangeType": {
        "INCREASED": 30,
        "DECREASED": 10,
        "NEW": 5,
        "DELETED": 0
      },
      "totalQuantityChange": 125.5,
      "totalAmountChange": 12550.75
    },
    "deltas": [
      {
        "id": "delta-uuid",
        "sheetDate": "2025-10-01",
        "branchCode": "001",
        "accountingCode": "100.01.001",
        "changeType": "INCREASED",
        "deltaType": "POST_SNAPSHOT",
        "oldValues": {
          "quantity": 10,
          "subTotal": 1000,
          "total": 1200
        },
        "newValues": {
          "quantity": 15,
          "subTotal": 1500,
          "total": 1800
        },
        "changes": {
          "quantity": 5,
          "subTotal": 500,
          "total": 600
        },
        "affectedOrderKeys": ["order-1", "order-2"],
        "changedAt": "2025-10-01T10:30:00Z"
      }
    ]
  }
}
```

### API Logging

Her API çağrısı loglanır:

```typescript
// app/api/erp/sales-summary/route.ts

const requestStartTime = Date.now();

try {
  // ... API logic

  logData.recordCount = summaryData.length;
  logData.statusCode = 200;
} catch (error) {
  logData.statusCode = 500;
  logData.errorMessage = error.message;
} finally {
  // Log kaydet
  await prisma.eRPApiLog.create({
    data: {
      companyId: company.id,
      endpoint: '/api/erp/sales-summary',
      method: 'GET',
      startDate: startDate,
      endDate: endDate,
      filters: JSON.stringify(filters),
      statusCode: logData.statusCode,
      responseTime: Date.now() - requestStartTime,
      recordCount: logData.recordCount,
      errorMessage: logData.errorMessage
    }
  });
}
```

---

## Veritabanı Yapısı

### Core Tables

#### 1. SalesRaw
**Amaç**: Ham transaction verileri (tüm versiyonlar)

```prisma
model SalesRaw {
  id              String   @id @default(uuid())
  orderKey        String   // Sipariş ID
  transactionID   String   // Transaction ID
  lineKey         Int?     // Line numarası

  // Tarih bilgileri
  orderDateTime   DateTime
  sheetDate       String   // YYYY-MM-DD
  importDate      DateTime

  // Ürün bilgileri
  menuItemText    String
  accountingCode  String?
  quantity        Float

  // Hash & Versiyon
  orderHash       String   // SHA-256 hash
  isLatest        Boolean  @default(true)
  version         Int      @default(1)
  syncBatchId     String

  @@index([orderKey, isLatest])
  @@index([syncBatchId])
}
```

#### 2. SalesSummary
**Amaç**: Özet satış verileri (accounting code + branch + date level)

```prisma
model SalesSummary {
  id                 String @id @default(uuid())

  // Gruplama anahtarları
  sheetDate          String
  accountingCode     String
  branchCode         String
  isMainCombo        Boolean
  taxPercent         Float
  mainAccountingCode String @default("")
  isExternal         Boolean

  // Toplam değerler
  quantity           Float
  subTotal           Float
  taxTotal           Float
  total              Float

  // Metadata
  version            Int      @default(1)
  dataHash           String
  lastModified       DateTime @default(now())
  lastSyncBatchId    String

  @@unique([sheetDate, branchCode, accountingCode, isMainCombo, taxPercent, mainAccountingCode])
}
```

#### 3. SalesSummaryDelta
**Amaç**: Summary seviyesindeki değişiklikler

```prisma
model SalesSummaryDelta {
  id                 String @id @default(uuid())

  // Summary anahtarları
  sheetDate          String
  accountingCode     String
  branchCode         String
  // ... diğer key alanlar

  // Değişiklik tipi
  changeType         String  // NEW, INCREASED, DECREASED, DELETED
  deltaType          String  // PRE_SNAPSHOT, POST_SNAPSHOT

  // Eski değerler
  oldQuantity        Float?
  oldSubTotal        Float?
  oldTaxTotal        Float?
  oldTotal           Float?

  // Yeni değerler
  newQuantity        Float?
  newSubTotal        Float?
  newTaxTotal        Float?
  newTotal           Float?

  // Metadata
  changedAt          DateTime @default(now())
  syncBatchId        String
  snapshotId         String?
  processed          Boolean  @default(false)

  @@index([sheetDate, processed])
  @@index([snapshotId, deltaType])
}
```

#### 4. SalesChangeLog
**Amaç**: OrderKey seviyesindeki değişiklik logları

```prisma
model SalesChangeLog {
  id            String   @id @default(uuid())
  orderKey      String
  changeType    String   // NEW, UPDATED, UNCHANGED

  oldHash       String?
  newHash       String
  oldVersion    Int?
  newVersion    Int

  orderSnapshot String?  // JSON: tüm transaction'lar

  syncBatchId   String
  detectedAt    DateTime @default(now())

  @@index([orderKey])
  @@index([syncBatchId])
}
```

#### 5. SyncBatch
**Amaç**: Her sync işleminin meta bilgileri

```prisma
model SyncBatch {
  id        String   @id @default(uuid())
  companyId String

  startDate String   // YYYY-MM-DD
  endDate   String

  status    String   // RUNNING, COMPLETED, FAILED

  // İstatistikler
  totalRecords     Int @default(0)
  newRecords       Int @default(0)
  updatedRecords   Int @default(0)
  unchangedRecords Int @default(0)

  startedAt   DateTime  @default(now())
  completedAt DateTime?
  duration    Int?      // milliseconds

  errorMessage String?

  @@index([companyId, startedAt])
}
```

#### 6. ERPSnapshot
**Amaç**: ERP snapshot kayıtları

```prisma
model ERPSnapshot {
  id            String   @id @default(uuid())
  companyId     String

  snapshotDate  DateTime
  dataStartDate String
  dataEndDate   String

  recordCount   Int @default(0)
  deltaCount    Int @default(0)

  createdAt     DateTime @default(now())

  deltas        SalesSummaryDelta[]

  @@index([companyId, snapshotDate])
}
```

#### 7. ERPApiLog
**Amaç**: ERP API çağrılarının loglanması

```prisma
model ERPApiLog {
  id           String   @id @default(uuid())
  companyId    String

  endpoint     String   // /api/erp/sales-summary, /api/erp/deltas
  method       String   @default("GET")
  startDate    String
  endDate      String
  filters      String?  // JSON

  statusCode   Int
  responseTime Int      // milliseconds
  recordCount  Int      @default(0)
  errorMessage String?

  requestedAt  DateTime @default(now())

  @@index([companyId, requestedAt])
  @@index([endpoint])
}
```

---

## Özet: Tam Akış Örneği

### Senaryo: Günlük Senkronizasyon

1. **Cron job çalışır** (her gün 02:00)
   ```typescript
   executeSync(companyId, '2025-10-01', '2025-10-01')
   ```

2. **RobotPOS'tan veri çekilir**
   - SQL query çalıştırılır
   - 1000 transaction gelir

3. **OrderKey'lere göre gruplanır**
   - 200 unique OrderKey

4. **Her OrderKey için hash hesaplanır**
   - Mevcut hash'ler ile karşılaştırılır
   - Sonuç: 150 UNCHANGED, 30 UPDATED, 20 NEW

5. **SalesRaw'a kaydedilir**
   - UPDATED olanlar: eski versiyon `isLatest=false`, yeni versiyon eklenir
   - NEW olanlar: `version=1` ile eklenir
   - UNCHANGED: güncelleme yapılmaz

6. **SalesSummary güncellenir**
   - Accounting code + branch + date bazında toplamlar hesaplanır
   - Hash değişen summary'ler güncellenir

7. **Delta'lar oluşturulur**
   - Summary değişiklikleri tespit edilir
   - SalesSummaryDelta'ya kaydedilir
   - ChangeType belirlenir (INCREASED/DECREASED/NEW)

8. **Snapshot oluşturulur**
   - ERPSnapshot kaydı
   - Delta'lar snapshot'a bağlanır

9. **ERP API'ye hazır**
   - ERP sistemi `/api/erp/deltas` ile değişiklikleri çekebilir
   - Veya `/api/erp/sales-summary` ile tüm özet veriyi alabilir

---

## Sorun Giderme

### Sık Karşılaşılan Sorunlar

1. **Hash çakışmaları**
   - Transaction'lar sıralanmadan hash hesaplanıyorsa
   - Çözüm: `LineKey`'e göre sırala

2. **Gereksiz delta oluşumu**
   - Float hassasiyet sorunları
   - Çözüm: `toFixed(2)` kullan

3. **Yavaş sync**
   - Çok fazla OrderKey
   - Çözüm: Batch processing, tarih aralığını küçült

4. **ERP API timeout**
   - Çok fazla delta
   - Çözüm: Pagination ekle

---

## İletişim & Destek

Sorularınız için:
- Email: destek@robotpos.com

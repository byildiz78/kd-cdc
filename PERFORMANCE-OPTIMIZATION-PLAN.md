# 🚀 Performance Optimization Plan: SQL Query Separation

## 📊 **Mevcut Durum Analizi**

### **Problemler:**
1. **Tek sorgu ile tüm data**: Header + Items + Payments aynı anda çekiliyor
2. **Gereksiz veri transferi**: Liste görünümünde detay bilgileri kullanılmıyor
3. **Memory usage**: Client'da büyük JSON objeler tutuluyor
4. **Network overhead**: Büyük response'lar
5. **Database load**: Karmaşık JOIN'ler her seferinde çalışıyor

### **Mevcut SQL Yapısı:**
```sql
SELECT
(
    SELECT 
        h.OrderKey, h.OrderID, br.BranchName, ... -- HEADER
        (SELECT ... FROM EInvoiceDetail d ...) AS Items,    -- DETAIL
        (SELECT ... FROM EInvoicePayment p ...) AS Payments -- PAYMENT
    FROM EInvoiceHeader h ...
    FOR JSON PATH
) AS Result
```

## 🎯 **Hedef Mimari**

### **2 Ayrı Endpoint:**
1. **`GET /api/invoices`** → Header listesi (hızlı)
2. **`GET /api/invoices/[orderKey]/details`** → Specific invoice detayı

### **Veri Akışı:**
```
📊 Liste Görünümü     →  Header-only query (hızlı)
    ↓ (Detay butonu)
💾 Modal/Detay        →  Detail query (specific)
```

## 📝 **SQL Sorgu Tasarımı**

### **1. Header-Only Query (sqlquery-headers.txt)**
```sql
SELECT
(
    SELECT
        h.OrderKey,
        h.OrderID,
        br.BranchName,
        br.ExternalCode,
        ( CASE WHEN h.IsEInvoice = 1 THEN 'E-FATURA' ELSE 'E-ARŞİV' END ) AS [Type],
        CONVERT(DECIMAL(18,2), h.InvoiceTotal) AS [InvoiceTotal],
        CONVERT(DECIMAL(18,2), h.OrderDiscount) AS [OrderDiscount],
        h.InvoiceDate,
        h.CustomerName,
        h.CustomerTaxNo,
        h.CustomerTaxOffice,
        ISNULL(h.UrnMail,'') AS [CustomerEMail],
        h.CustomerStreetName AS [CustomerAddress],
        h.InvoiceRefNo AS RefNo,
        'RobotPos' AS UserCode,
        'TD' AS UserType,
        -- Items ve Payments yok! Sadece count'lar
        (SELECT COUNT(*) FROM EInvoiceDetail d WITH(NOLOCK) WHERE d.OrderKey = h.OrderKey) AS ItemCount,
        (SELECT COUNT(*) FROM EInvoicePayment p WITH(NOLOCK) WHERE p.OrderKey = h.OrderKey) AS PaymentCount
    FROM
        EInvoiceHeader h WITH(NOLOCK)
        INNER JOIN efr_Branchs br ON br.BranchID= h.Branch AND br.CustomField7 = 'TDUN'
        LEFT JOIN SyncLogoEInvoiceSend s ON s.ORDERKEY = h.OrderKey
    WHERE
        1=1
        AND h.IsChecked = 1
        AND ISNULL(h.CustomerTaxNo, '') <> ''
        AND h.InvoiceDate BETWEEN @StartDate AND @EndDate
        AND h.InvoiceDate > '2020-01-01'
    ORDER BY h.InvoiceDate ASC
    
    FOR JSON PATH
) AS Result
```

### **2. Detail Query (sqlquery-details.txt)**
```sql
SELECT
(
    SELECT
        h.OrderKey,
        h.OrderID,
        br.BranchName,
        br.ExternalCode,
        ( CASE WHEN h.IsEInvoice = 1 THEN 'E-FATURA' ELSE 'E-ARŞİV' END ) AS [Type],
        CONVERT(DECIMAL(18,2), h.InvoiceTotal) AS [InvoiceTotal],
        CONVERT(DECIMAL(18,2), h.OrderDiscount) AS [OrderDiscount],
        h.InvoiceDate,
        h.CustomerName,
        h.CustomerTaxNo,
        h.CustomerTaxOffice,
        ISNULL(h.UrnMail,'') AS [CustomerEMail],
        h.CustomerStreetName AS [CustomerAddress],
        h.InvoiceRefNo AS RefNo,
        'RobotPos' AS UserCode,
        'TD' AS UserType,
        -- FULL DETAIL DATA
        (
            SELECT
                d.LineKey AS TransactionKey,
                d.ItemCode,
                d.ItemsDefinition,
                CAST ( d.TaxPercent AS INT ) AS TaxPercent,
                CONVERT ( DECIMAL ( 18, 3 ), d.Quantity ) AS [Quantity],
                CONVERT ( DECIMAL ( 18, 2 ), d.UnitPrice ) AS [UnitPrice],
                CONVERT ( DECIMAL ( 18, 2 ), d.ExtendedPrice ) AS [Amount],
                CONVERT ( DECIMAL ( 18, 2 ), d.DiscountTotal ) AS [DiscountTotal],
                d.IsMainCombo,
                d.MainMenuItemTransactionKey AS MainTransactionKey
            FROM
                EInvoiceDetail d WITH(NOLOCK)
            WHERE
                d.OrderKey = h.OrderKey FOR JSON PATH    
        ) AS Items, 
        (
            SELECT
                p.PaymentKey,
                ISNULL(p.PaymentName2, p.PaymentName) AS PaymentName,
                p.GlobalBankName AS SubPaymentName,
                CONVERT ( DECIMAL ( 18, 2 ), p.Amount ) AS [Amount] 
            FROM
                EInvoicePayment p WITH(NOLOCK)
            WHERE
                p.OrderKey = h.OrderKey FOR JSON PATH
        ) AS Payments
    FROM
        EInvoiceHeader h WITH(NOLOCK)
        INNER JOIN efr_Branchs br ON br.BranchID= h.Branch AND br.CustomField7 = 'TDUN'
        LEFT JOIN SyncLogoEInvoiceSend s ON s.ORDERKEY = h.OrderKey
    WHERE
        h.OrderKey = @OrderKey
        AND h.IsChecked = 1
        AND ISNULL(h.CustomerTaxNo, '') <> ''
    
    FOR JSON PATH
) AS Result
```

## 🔧 **API Endpoint Tasarımı**

### **1. Mevcut Endpoint Güncelleme**
```typescript
// app/api/invoices/route.ts → Header-only
POST /api/invoices
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}

Response: {
  OrderKey, OrderID, BranchName, Type, InvoiceTotal, 
  CustomerName, CustomerTaxNo, InvoiceDate, ItemCount, PaymentCount
  // Items ve Payments yok!
}[]
```

### **2. Yeni Detail Endpoint**
```typescript
// app/api/invoices/[orderKey]/route.ts → Detail
GET /api/invoices/{orderKey}

Response: {
  OrderKey, OrderID, BranchName, Type, InvoiceTotal,
  CustomerName, CustomerTaxNo, InvoiceDate,
  Items: [...],      // FULL ITEMS
  Payments: [...]    // FULL PAYMENTS
}
```

## 💻 **Frontend Değişiklikleri**

### **1. Data Interface Updates**
```typescript
// types/invoice.ts
interface InvoiceHeader {
  OrderKey: string;
  OrderID: number;
  BranchName: string;
  Type: 'E-FATURA' | 'E-ARŞİV';
  InvoiceTotal: number;
  CustomerName: string;
  CustomerTaxNo: string;
  InvoiceDate: string;
  ItemCount: number;    // NEW
  PaymentCount: number; // NEW
  // Items ve Payments yok!
}

interface InvoiceDetail extends InvoiceHeader {
  Items: InvoiceItem[];
  Payments: InvoicePayment[];
}
```

### **2. API Functions Update**
```typescript
// lib/api.ts
export async function fetchInvoiceHeaders(params: FetchInvoicesParams): Promise<InvoiceHeader[]> {
  const response = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return response.json();
}

export async function fetchInvoiceDetail(orderKey: string): Promise<InvoiceDetail> {
  const response = await fetch(`/api/invoices/${orderKey}`);
  return response.json();
}
```

### **3. Component State Management**
```typescript
// app/page.tsx
const [documents, setDocuments] = useState<InvoiceHeader[]>([]);  // Header only
const [selectedDocumentDetail, setSelectedDocumentDetail] = useState<InvoiceDetail | null>(null);
const [loadingDetail, setLoadingDetail] = useState(false);

const handleDocumentClick = async (document: InvoiceHeader) => {
  setLoadingDetail(true);
  try {
    const detail = await fetchInvoiceDetail(document.OrderKey);
    setSelectedDocumentDetail(detail);
    setIsModalOpen(true);
  } catch (error) {
    console.error('Error loading detail:', error);
  } finally {
    setLoadingDetail(false);
  }
};
```

### **4. UI Improvements**
```typescript
// components/DocumentTable.tsx - ItemCount göster
<td className="px-6 py-4 whitespace-nowrap">
  <div className="text-sm text-gray-600">
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      {document.ItemCount} kalem
    </span>
    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      {document.PaymentCount} ödeme
    </span>
  </div>
</td>

// Detay butonu loading state
<button
  onClick={() => handleDocumentClick(document)}
  disabled={loadingDetail}
  className="..."
>
  {loadingDetail ? <Spinner /> : <Eye />}
  {loadingDetail ? 'Yükleniyor...' : 'Detay'}
</button>
```

## 📈 **Performance Kazanımları**

### **Veri Transfer Optimizasyonu:**
```
ÖNCE:
- List görünümü: ~50KB per invoice (items + payments dahil)
- 100 fatura = ~5MB transfer
- DOM'da büyük objeler

SONRA:
- List görünümü: ~2KB per invoice (header only)
- 100 fatura = ~200KB transfer
- Detail sadece gerektiğinde = ~50KB
```

### **Database Performance:**
```
ÖNCE:
- Her liste yüklemede JOIN'li complex query
- N+1 problem yoktu ama tek büyük query

SONRA:
- Liste için simple header query (hızlı)
- Detail için targeted query (1 fatura)
```

### **Memory Usage:**
```
ÖNCE:
- Client'da 100 fatura * 50KB = 5MB RAM
- Sürekli memory'de tut

SONRA:
- Client'da 100 fatura * 2KB = 200KB RAM
- Detail cache (optional) = +50KB gerektiğinde
```

## 🛠 **Implementation Adımları**

### **Phase 1: SQL Queries** ⭐
1. `sqlquery-headers.txt` oluştur
2. `sqlquery-details.txt` oluştur
3. Test queries on database

### **Phase 2: Backend API** ⭐⭐
1. Mevcut `/api/invoices` endpoint'i güncellle
2. Yeni `/api/invoices/[orderKey]/route.ts` oluştur
3. Error handling ve validation ekle

### **Phase 3: Frontend Types** ⭐
1. TypeScript interfaces güncelle
2. API functions ayır (headers vs detail)

### **Phase 4: UI Components** ⭐⭐⭐
1. DocumentTable.tsx → ItemCount/PaymentCount göster
2. Modal loading state ekle
3. Detail fetch logic implement
4. Error handling improve

### **Phase 5: Testing & Optimization** ⭐⭐
1. Performance testing
2. Error scenarios test
3. Large dataset testing
4. Mobile responsive check

## 🔄 **Migration Strategy**

### **Backward Compatibility:**
1. Mevcut `/api/invoices` endpoint'i önce dual-mode yap
2. Query parameter ile mode seç: `?mode=headers` vs `?mode=full`
3. Frontend'i kademeli geçir
4. Eski mode'u deprecated olarak işaretle
5. Sonra tamamen kaldır

### **Risk Mitigation:**
1. Feature flag ile yeni behavior'ı açıp kapat
2. Rollback planı hazır
3. Performance monitoring ekle
4. User feedback collect

## 📊 **Success Metrics**

### **Performance KPIs:**
- Initial page load time: %80+ improvement target
- Memory usage: %90+ reduction target
- Network transfer: %95+ reduction target
- Detail modal load time: <500ms target

### **User Experience:**
- Sayfa yükleme hızı artışı
- Smooth scrolling liste görünümünde
- Hızlı arama ve filtreleme
- Detail modal'ın responsive loading'i

Bu plan ile hem performance hem user experience'i önemli ölçüde iyileştirebiliriz! 🚀
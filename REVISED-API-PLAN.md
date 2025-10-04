# 🔄 Revised API Architecture Plan

## 📌 **API Endpoint Yapısı**

### **Mevcut (Korunacak):**
```
POST /api/invoices → Full data (backward compatibility)
```

### **Yeni Endpoint'ler:**
```
GET  /api/invoices/headers     → Header listesi (optimized)
GET  /api/invoices/:orderKey   → Specific invoice detayı
```

## 🏗️ **Yeni API Endpoint Tasarımı**

### **1. Headers Endpoint**
```typescript
// app/api/invoices/headers/route.ts
GET /api/invoices/headers?startDate=2024-01-01&endDate=2024-01-31

Response:
[
  {
    "OrderKey": "366C47D9-4A1E-4A20-B2C4-5C992C666E57",
    "OrderID": 9372,
    "BranchName": "10 BALIKESİR TİCARET MERKEZİ",
    "ExternalCode": "40000007",
    "Type": "E-FATURA",
    "InvoiceTotal": 1064.00,
    "OrderDiscount": 0.00,
    "InvoiceDate": "2023-07-15T13:16:47",
    "CustomerName": "GÜNIL INSAAT TUR. ITH. IHR. SAN. TIC. A.S.",
    "CustomerTaxNo": "4380395214",
    "CustomerTaxOffice": ".AYRANCILAR  TORBALI İZMİR",
    "CustomerEMail": "urn:mail:defaultpk@hgibalikesir.com",
    "CustomerAddress": ". FEYZİ ÇAKMAK MAH. KAZIMKARABEKİR PAŞA CD. NO 32",
    "RefNo": "",
    "UserCode": "RobotPos",
    "UserType": "TD",
    "ItemCount": 24,      // NEW
    "PaymentCount": 1     // NEW
    // Items ve Payments YOK!
  }
]
```

### **2. Detail Endpoint**
```typescript
// app/api/invoices/[orderKey]/route.ts
GET /api/invoices/366C47D9-4A1E-4A20-B2C4-5C992C666E57

Response:
{
  "OrderKey": "366C47D9-4A1E-4A20-B2C4-5C992C666E57",
  "OrderID": 9372,
  "BranchName": "10 BALIKESİR TİCARET MERKEZİ",
  // ... tüm header fields ...
  "Items": [
    {
      "TransactionKey": "BFC76F30-8498-4F3E-8726-6EB48A3D823A",
      "ItemCode": "4000810",
      "ItemsDefinition": "PERSONEL MENÜ",
      // ... tüm item detayları ...
    }
  ],
  "Payments": [
    {
      "PaymentKey": "1FDEE350-0AE2-4D39-9B5F-3AE0DBE3E107",
      "PaymentName": "MOBİL",
      // ... tüm payment detayları ...
    }
  ]
}
```

## 📄 **SQL Query Dosyaları**

### **1. sqlquery-headers.txt**
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
        -- Count'lar performance için
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

### **2. sqlquery-detail.txt**
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

## 💻 **Frontend Değişiklikleri**

### **1. API Functions Update**
```typescript
// lib/api.ts

// Mevcut fonksiyon backward compatibility için kalacak
export async function fetchInvoices(params: FetchInvoicesParams = {}): Promise<any[]> {
  // ... existing code ...
}

// YENİ: Header-only fetch
export async function fetchInvoiceHeaders(params: {
  startDate: string;
  endDate: string;
}): Promise<InvoiceHeader[]> {
  try {
    const queryParams = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate
    });
    
    const response = await fetch(`/api/invoices/headers?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch invoice headers');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching invoice headers:', error);
    throw error;
  }
}

// YENİ: Specific invoice detail fetch
export async function fetchInvoiceDetail(orderKey: string): Promise<InvoiceDetail> {
  try {
    const response = await fetch(`/api/invoices/${orderKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch invoice detail');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching invoice detail:', error);
    throw error;
  }
}
```

### **2. Type Definitions**
```typescript
// types/invoice.ts
export interface InvoiceHeader {
  OrderKey: string;
  OrderID: number;
  BranchName: string;
  ExternalCode: string;
  Type: 'E-FATURA' | 'E-ARŞİV';
  InvoiceTotal: number;
  OrderDiscount: number;
  InvoiceDate: string;
  CustomerName: string;
  CustomerTaxNo: string;
  CustomerTaxOffice: string;
  CustomerEMail: string;
  CustomerAddress: string;
  RefNo: string;
  UserCode: string;
  UserType: string;
  ItemCount: number;    // NEW
  PaymentCount: number; // NEW
}

export interface InvoiceDetail extends InvoiceHeader {
  Items: InvoiceItem[];
  Payments: InvoicePayment[];
}

export interface InvoiceItem {
  TransactionKey: string;
  ItemCode: string;
  ItemsDefinition: string;
  TaxPercent: number;
  Quantity: number;
  UnitPrice: number;
  Amount: number;
  DiscountTotal: number;
  IsMainCombo: boolean;
  MainTransactionKey?: string;
}

export interface InvoicePayment {
  PaymentKey: string;
  PaymentName: string;
  SubPaymentName: string;
  Amount: number;
}
```

### **3. Main Component Update**
```typescript
// app/page.tsx değişiklikleri

// State updates
const [documents, setDocuments] = useState<InvoiceHeader[]>([]);
const [selectedDocumentDetail, setSelectedDocumentDetail] = useState<InvoiceDetail | null>(null);
const [loadingDetail, setLoadingDetail] = useState(false);

// Load headers instead of full data
useEffect(() => {
  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      
      const today = new Date().toISOString().split('T')[0];
      // YENİ: fetchInvoiceHeaders kullan
      const data = await fetchInvoiceHeaders({
        startDate: today,
        endDate: today
      });
      setDocuments(data);
      setFilteredDocuments(data);
    } catch (err) {
      setError('Belgeler yüklenirken bir hata oluştu');
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  loadDocuments();
}, [authLoading, user]);

// Handle detail click with new API
const handleDocumentClick = async (document: InvoiceHeader) => {
  setLoadingDetail(true);
  try {
    // YENİ: Detayı ayrı fetch et
    const detail = await fetchInvoiceDetail(document.OrderKey);
    setSelectedDocumentDetail(detail);
    setIsModalOpen(true);
  } catch (error) {
    console.error('Error loading invoice detail:', error);
    // Error handling - show toast or alert
  } finally {
    setLoadingDetail(false);
  }
};

// Update modal to use detail data
<DocumentModal
  documentData={selectedDocumentDetail} // detail data kullan
  isOpen={isModalOpen}
  onClose={handleCloseModal}
/>
```

## 🚀 **Implementation Adımları**

### **Step 1: SQL Query Dosyalarını Oluştur**
1. ✅ `sqlquery-headers.txt` oluştur
2. ✅ `sqlquery-detail.txt` oluştur

### **Step 2: Backend API Implementation**
1. ✅ `/api/invoices` mevcut endpoint'i koru
2. ✅ `/api/invoices/headers/route.ts` implement et
3. ✅ `/api/invoices/[orderKey]/route.ts` implement et

### **Step 3: Frontend Updates**
1. ✅ Type definitions ekle
2. ✅ API functions ekle
3. ✅ Main component'i güncelle
4. ✅ DocumentModal'ı detail data için güncelle

### **Step 4: UI Enhancements**
1. ✅ Item/Payment count badges ekle
2. ✅ Loading states improve et
3. ✅ Error handling ekle

## 📊 **Migration Strategy**

1. **Phase 1**: Yeni endpoint'leri deploy et (mevcut çalışmaya devam)
2. **Phase 2**: Frontend'i yeni endpoint'lere geçir
3. **Phase 3**: Performance monitoring
4. **Phase 4**: Eski endpoint'i deprecate et (opsiyonel)

## 🎯 **Beklenen Sonuçlar**

- **Liste yükleme**: %95+ daha hızlı
- **Memory kullanımı**: %90+ azalma
- **Network transfer**: Minimal
- **User experience**: Smooth ve responsive
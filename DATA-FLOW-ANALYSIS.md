# Veri Akışı ve Web Servis Analizi

## 📊 **Veri Akışı Genel Bakış**

```
🌐 External Database → 📡 RobotPos API → 🚀 Next.js API Route → 💻 Frontend → 📱 UI Components
```

## 1. **Web Servis Veri Alma Süreci**

### **1.1 Veri Kaynağı**
- **Database**: SQL Server tabloları (EInvoiceHeader, EInvoiceDetail, EInvoicePayment)
- **SQL Query**: `sqlquery.txt` dosyasındaki karmaşık JOIN sorgusu
- **RobotPos API**: `https://pos-integration.robotpos.com/realtimeapi/api/query`

### **1.2 SQL Sorgu Yapısı**
```sql
SELECT
(
    SELECT
        h.OrderKey,
        h.OrderID,
        br.BranchName,
        -- Ana fatura bilgileri
        (
            SELECT -- Items alt sorgusu (JSON)
        ) AS Items,
        (  
            SELECT -- Payments alt sorgusu (JSON)
        ) AS Payments
    FROM EInvoiceHeader h
    -- JOIN ve WHERE filtreleri
    FOR JSON PATH
) AS Result
```

### **1.3 API İstek Akışı**

#### **Frontend → Backend API Route**
```typescript
// lib/api.ts
const response = await fetch('/api/invoices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ startDate, endDate })
});
```

#### **Backend API Route → External API**
```typescript
// app/api/invoices/route.ts
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sqlQuery })
});
```

### **1.4 Veri Dönüştürme Süreci**

#### **Adım 1: SQL Parametreleri**
```typescript
// Tarih parametrelerini SQL'e inject et
sqlQuery = sqlQuery.replace(/@StartDate/g, `'${startDate}'`);
sqlQuery = sqlQuery.replace(/@EndDate/g, `'${endDate}'`);
```

#### **Adım 2: API Response Parsing**
```typescript
// JSON response'u parse et
const data = JSON.parse(responseText);

// Result alanındaki JSON string'i parse et
if (resultData.Result) {
  invoices = JSON.parse(resultData.Result);
  
  // Nested JSON'ları parse et
  invoices = invoices.map((invoice: any) => ({
    ...invoice,
    Items: typeof invoice.Items === 'string' ? JSON.parse(invoice.Items) : invoice.Items,
    Payments: typeof invoice.Payments === 'string' ? JSON.parse(invoice.Payments) : invoice.Payments,
  }));
}
```

## 2. **Frontend Veri İşleme**

### **2.1 State Management**
```typescript
// app/page.tsx - Ana component state'leri
const [documents, setDocuments] = useState<any[]>([]);
const [filteredDocuments, setFilteredDocuments] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [searchTerm, setSearchTerm] = useState('');
```

### **2.2 Veri Yükleme Triggers**

#### **İlk Yükleme**
```typescript
useEffect(() => {
  const today = new Date().toISOString().split('T')[0];
  const data = await fetchInvoices({ startDate: today, endDate: today });
  setDocuments(data);
}, []);
```

#### **Tarih Filtresi**
```typescript
useEffect(() => {
  if (dateRange?.start && dateRange?.end) {
    const data = await fetchInvoices({
      startDate: dateRange.start,
      endDate: dateRange.end
    });
    setDocuments(data);
  }
}, [dateRange?.start, dateRange?.end]);
```

### **2.3 Client-Side Filtering**
```typescript
useEffect(() => {
  let filtered = documents;
  
  if (searchTerm.trim()) {
    filtered = filtered.filter((doc: any) =>
      doc.CustomerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.OrderID?.toString().includes(searchTerm) ||
      doc.BranchName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.CustomerTaxNo?.includes(searchTerm) ||
      doc.Type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  setFilteredDocuments(filtered);
}, [searchTerm, documents]);
```

## 3. **UI Component Render Süreci**

### **3.1 Ana Dashboard (page.tsx)**
```
📊 Stats Cards (Toplam Belge, Tutar, Şube, Türler)
    ↓
🔍 Search & Filter Controls
    ↓
📋 Document Display (3 görünüm modu)
    ↓
🪟 Modal (Detay görüntüleme)
```

### **3.2 Görünüm Modları**

#### **Tablo Görünümü (DocumentTable.tsx)**
- **Sorting**: Tarih, şube, müşteri, vergi no, tutar
- **Pagination**: 10 kayıt/sayfa
- **Responsive**: Mobil uyumlu
```typescript
const sortedDocuments = [...documents].sort((a, b) => {
  // Sorting logic
});

const currentDocuments = sortedDocuments.slice(startIndex, endIndex);
```

#### **Grid Görünümü (DocumentCard.tsx)**
- Kart bazlı görüntüleme
- Her kart bir fatura

#### **Şube Bazlı Görünüm (BranchGroupedTable.tsx)**
- Şubelere göre gruplandırma
- Hierarchical display

### **3.3 Veri Formatlama**

#### **Tarih Formatı**
```typescript
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};
```

#### **Para Formatı**
```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount);
};
```

## 4. **Authentication Flow**

### **4.1 Session-Based Auth**
```typescript
// Login → Session Cookie
const sessionToken = Buffer.from(`${username}:${Date.now()}`).toString('base64');

// API Routes → Session Validation
const sessionData = Buffer.from(decoded, 'base64').toString();
const [username, timestamp] = sessionData.split(':');
```

## 5. **Performance Optimizations**

### **5.1 Client-Side Optimizations**
- **Local Search**: Server'a tekrar istek atmadan arama
- **Pagination**: Büyük data setleri için sayfalama
- **Loading States**: UX için loading göstergeleri

### **5.2 Potential Issues**
- **Memory Usage**: Tüm veri client'da tutulur
- **Large Datasets**: Pagination server-side değil
- **Real-time Updates**: Polling yok

## 6. **Veri Yapısı**

### **6.1 Invoice Object Structure**
```typescript
interface Invoice {
  OrderKey: string;           // UUID
  OrderID: number;           // Sipariş numarası
  BranchName: string;        // Şube adı
  Type: 'E-FATURA' | 'E-ARŞİV';
  InvoiceTotal: number;      // Toplam tutar
  InvoiceDate: string;       // ISO date
  CustomerName: string;      // Müşteri adı
  CustomerTaxNo: string;     // Vergi numarası
  Items: InvoiceItem[];      // Kalemler
  Payments: InvoicePayment[]; // Ödemeler
}
```

### **6.2 Nested Data Structures**
- **Items**: Fatura kalemleri (products, quantities, prices)
- **Payments**: Ödeme bilgileri (payment methods, amounts)

## 7. **Error Handling**

### **7.1 API Level**
```typescript
try {
  const data = await fetchInvoices(params);
} catch (error) {
  setError('Belgeler yüklenirken bir hata oluştu');
}
```

### **7.2 Network Level**
- Timeout handling
- Retry logic (yok, eklenebilir)
- Connection failure handling

## 8. **Security Considerations**

### **8.1 Current State**
- ✅ Session-based authentication
- ✅ HTTP-only cookies
- ❌ CSRF protection yok
- ❌ Rate limiting yok
- ❌ Input sanitization sınırlı

## 9. **Potential Improvements**

### **9.1 Performance**
- Server-side pagination
- Virtual scrolling for large datasets
- Caching strategies
- Real-time updates with WebSocket

### **9.2 UX**
- Infinite scroll
- Better error messages
- Offline support
- Progressive loading

### **9.3 Architecture**
- Global state management (Zustand/Redux)
- React Query for data fetching
- Error boundaries
- Loading skeletons
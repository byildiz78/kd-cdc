import crypto from 'crypto';

export interface OrderTransaction {
  transactionID: string | number;
  menuItemID: string | number | null;
  quantity: number;
  extendedPrice: number;
  amountDue: number;
  accountingCode: string;
  headerDeleted: boolean;
  lineSubTotal: number;
  lineTaxTotal: number;
  lineTotal: number;
}

export interface SummaryData {
  quantity: number;
  subTotal: number;
  taxTotal: number;
  total: number;
}

/**
 * OrderKey bazında hash hesaplar
 * Tüm transaction'ları birleştirerek tek bir hash oluşturur
 */
export function calculateOrderHash(transactions: OrderTransaction[]): string {
  // Transaction'ları TransactionID'ye göre sırala (tutarlılık için)
  const sorted = [...transactions].sort((a, b) => {
    const aId = typeof a.transactionID === 'string' ? a.transactionID : String(a.transactionID);
    const bId = typeof b.transactionID === 'string' ? b.transactionID : String(b.transactionID);
    return aId.localeCompare(bId);
  });

  // Her transaction için hash string'i oluştur
  const hashData = sorted
    .map((t) => {
      return [
        t.transactionID,
        t.menuItemID ?? 'null',
        t.quantity,
        t.extendedPrice,
        t.amountDue,
        t.accountingCode,
        t.headerDeleted ? '1' : '0',
        t.lineSubTotal,
        t.lineTaxTotal,
        t.lineTotal,
      ].join('|');
    })
    .join('||');

  return crypto.createHash('sha256').update(hashData).digest('hex');
}

/**
 * Summary hash hesaplar
 */
export function calculateSummaryHash(summary: SummaryData): string {
  const data = `${summary.quantity}|${summary.subTotal}|${summary.taxTotal}|${summary.total}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * İki hash'i karşılaştırır
 */
export function hasChanged(oldHash: string | null, newHash: string): boolean {
  return oldHash !== newHash;
}

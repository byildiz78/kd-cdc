export interface SummaryKey {
  sheetDate: string;
  mainAccountingCode: string;
  accountingCode: string;
  isMainCombo: boolean;
  taxPercent: number;
  branchID: number;
  branchCode: string;
  isExternal: boolean;
}

export interface GroupedTransactions {
  [orderKey: string]: any[];
}

export interface SummaryData {
  quantity: number;
  subTotal: number;
  taxTotal: number;
  total: number;
}

/**
 * Raw data'yı OrderKey'e göre grupla
 */
export function groupByOrderKey(rawData: any[]): GroupedTransactions {
  return rawData.reduce((acc, row) => {
    const orderKey = row.OrderKey || row.orderKey;
    if (!acc[orderKey]) {
      acc[orderKey] = [];
    }
    acc[orderKey].push(row);
    return acc;
  }, {} as GroupedTransactions);
}

/**
 * Transaction için summary key oluştur
 */
export function generateSummaryKey(transaction: any): SummaryKey {
  return {
    sheetDate: transaction.SheetDate || transaction.sheetDate,
    mainAccountingCode: transaction.MainAccountingCode || transaction.mainAccountingCode || '',
    accountingCode: transaction.AccountingCode || transaction.accountingCode,
    isMainCombo: Boolean(transaction.IsMainCombo ?? transaction.isMainCombo),
    taxPercent: parseFloat(transaction.TaxPercent ?? transaction.taxPercent),
    branchID: parseInt(transaction.BranchID ?? transaction.branchID),
    branchCode: transaction.BranchCode || transaction.branchCode,
    isExternal: Boolean(transaction.IsExternal ?? transaction.isExternal),
  };
}

/**
 * Summary key'den unique string oluştur
 */
export function summaryKeyToString(key: SummaryKey): string {
  return JSON.stringify(key);
}

/**
 * String'den summary key'e çevir
 */
export function stringToSummaryKey(keyString: string): SummaryKey {
  return JSON.parse(keyString);
}

/**
 * Raw data'yı summary key'e göre grupla
 */
export function groupBySummaryKey(rawData: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();

  for (const row of rawData) {
    const key = generateSummaryKey(row);
    const keyString = summaryKeyToString(key);

    if (!groups.has(keyString)) {
      groups.set(keyString, []);
    }

    groups.get(keyString)!.push(row);
  }

  return groups;
}

/**
 * Gruptan summary hesapla
 */
export function calculateSummaryFromGroup(group: any[]): SummaryData {
  return {
    quantity: group.reduce((sum, row) => {
      const qty = row.Quantity ?? row.quantity ?? 0;
      return sum + parseFloat(String(qty));
    }, 0),
    subTotal: group.reduce((sum, row) => {
      const sub = row.LineSubTotal ?? row.lineSubTotal ?? 0;
      return sum + parseFloat(String(sub));
    }, 0),
    taxTotal: group.reduce((sum, row) => {
      const tax = row.LineTaxTotal ?? row.lineTaxTotal ?? 0;
      return sum + parseFloat(String(tax));
    }, 0),
    total: group.reduce((sum, row) => {
      const tot = row.LineTotal ?? row.lineTotal ?? 0;
      return sum + parseFloat(String(tot));
    }, 0),
  };
}

/**
 * Order'ın belirli bir summary grubuna katkısını hesapla
 */
export function calculateOrderContribution(
  orderTransactions: any[],
  summaryKey: SummaryKey
): SummaryData {
  // Bu order'ın bu summary key'e ait transaction'larını filtrele
  const matching = orderTransactions.filter((tx) => {
    const txKey = generateSummaryKey(tx);
    return summaryKeyToString(txKey) === summaryKeyToString(summaryKey);
  });

  return calculateSummaryFromGroup(matching);
}

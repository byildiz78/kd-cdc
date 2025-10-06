import { prisma } from '@/lib/prisma';
import { calculateOrderHash, hasChanged } from './hash.service';

/**
 * Tek bir OrderKey'i işle
 * Hash değişikliği varsa yeni versiyon oluştur
 */
export async function processOrderKey(
  orderKey: string,
  transactions: any[],
  syncBatchId: string
): Promise<'NEW' | 'UPDATED' | 'UNCHANGED'> {
  console.log(`[Sync Processor] Processing OrderKey: ${orderKey}, Transactions: ${transactions.length}`);

  // Hash hesapla
  const newHash = calculateOrderHash(
    transactions.map((tx) => ({
      transactionID: tx.TransactionID,
      menuItemID: tx.MenuItemID || null,
      quantity: parseFloat(tx.Quantity),
      extendedPrice: parseFloat(tx.ExtendedPrice),
      amountDue: parseFloat(tx.AmountDue),
      accountingCode: tx.AccountingCode,
      headerDeleted: Boolean(tx.HeaderDeleted),
      lineSubTotal: parseFloat(tx.LineSubTotal),
      lineTaxTotal: parseFloat(tx.LineTaxTotal),
      lineTotal: parseFloat(tx.LineTotal),
    }))
  );

  // Mevcut kaydı kontrol et
  const existing = await prisma.salesRaw.findFirst({
    where: {
      orderKey,
      isLatest: true,
    },
  });

  // Hash değişmemişse skip et
  if (existing && !hasChanged(existing.orderHash, newHash)) {
    return 'UNCHANGED';
  }

  const isNew = !existing;
  const oldVersion = existing?.version || 0;
  const newVersion = oldVersion + 1;

  // Eski kayıtları isLatest=false yap
  if (existing) {
    await prisma.salesRaw.updateMany({
      where: {
        orderKey,
        isLatest: true,
      },
      data: { isLatest: false },
    });
  }

  // Yeni kayıtları ekle
  try {
    await prisma.salesRaw.createMany({
      data: transactions.map((tx) => ({
        orderKey,
        transactionID: tx.TransactionID,
        lineKey: null,
        orderDateTime: new Date(tx.OrderDateTime),
        sheetDate: tx.SheetDate,
        importDate: new Date(tx.ImportDate),
        menuItemID: tx.MenuItemID || null,
        menuItemText: tx.MenuItemText,
        mainAccountingCode: tx.MainAccountingCode || null,
        accountingCode: tx.AccountingCode,
        isMainCombo: Boolean(tx.IsMainCombo),
        quantity: parseFloat(tx.Quantity),
        extendedPrice: parseFloat(tx.ExtendedPrice),
        taxPercent: parseFloat(tx.TaxPercent),
        amountDue: parseFloat(tx.AmountDue),
        orderSubTotal: parseFloat(tx.OrderSubTotal),
        orderStatus: parseInt(tx.OrderStatus),
        isInvoice: Boolean(tx.IsInvoice),
        headerDeleted: Boolean(tx.HeaderDeleted),
        transactionDeleted: Boolean(tx.TransactionDeleted),
        branchID: parseInt(tx.BranchID),
        branchCode: tx.BranchCode,
        branchType: tx.BranchType,
        isExternal: Boolean(tx.IsExternal),
        adjustedPrice: parseFloat(tx.AdjustedPrice),
        lineSubTotal: parseFloat(tx.LineSubTotal),
        lineTaxTotal: parseFloat(tx.LineTaxTotal),
        lineTotal: parseFloat(tx.LineTotal),
        orderHash: newHash,
        isLatest: true,
        version: newVersion,
        syncBatchId,
      })),
    });
    console.log(`[Sync Processor] Created ${transactions.length} records for OrderKey: ${orderKey}`);
  } catch (error) {
    console.error(`[Sync Processor] Error creating records for OrderKey ${orderKey}:`, error);
    throw error;
  }

  // Change log kaydet
  const changeType = isNew
    ? 'CREATED'
    : existing && existing.importDate.toISOString() !== new Date(transactions[0].ImportDate).toISOString()
    ? 'REIMPORTED'
    : 'UPDATED';

  // Değişen alanları tespit et ve snapshot oluştur
  let changedFields: string[] = [];
  let orderSnapshot: any = null;

  if (!isNew && existing) {
    const oldData = await prisma.salesRaw.findMany({
      where: { orderKey, version: existing.version },
    });

    // İlk transaction'ları karşılaştır
    const fieldsToCheck = [
      'quantity', 'extendedPrice', 'taxPercent', 'amountDue',
      'orderSubTotal', 'orderStatus', 'lineSubTotal', 'lineTaxTotal',
      'lineTotal', 'headerDeleted', 'transactionDeleted'
    ];

    // Transaction sayısı değiştiyse
    if (oldData.length !== transactions.length) {
      changedFields.push('transactionCount');
    }

    // Alan değişikliklerini kontrol et
    // TransactionID'ye göre sırala (hash hesaplamasındaki gibi)
    const sortedOldData = [...oldData].sort((a, b) => {
      const aId = String(a.transactionID);
      const bId = String(b.transactionID);
      return aId.localeCompare(bId);
    });

    const sortedNewData = [...transactions].sort((a, b) => {
      const aId = String(a.TransactionID);
      const bId = String(b.TransactionID);
      return aId.localeCompare(bId);
    });

    for (const field of fieldsToCheck) {
      const oldValues = sortedOldData.map((d: any) => d[field]);
      const newValues = sortedNewData.map((t: any) => {
        const key = field.charAt(0).toUpperCase() + field.slice(1);
        return t[key];
      });

      if (JSON.stringify(oldValues) !== JSON.stringify(newValues)) {
        changedFields.push(field);
      }
    }

    // Order snapshot oluştur (eski ve yeni versiyon)
    orderSnapshot = {
      orderKey,
      changes: changedFields,
      versions: {
        old: {
          version: existing.version,
          hash: existing.orderHash,
          transactionCount: oldData.length,
          transactions: oldData.map((t) => ({
            transactionID: t.transactionID,
            menuItemText: t.menuItemText,
            accountingCode: t.accountingCode,
            quantity: t.quantity,
            extendedPrice: t.extendedPrice,
            amountDue: t.amountDue,
            lineSubTotal: t.lineSubTotal,
            lineTaxTotal: t.lineTaxTotal,
            lineTotal: t.lineTotal,
            headerDeleted: t.headerDeleted,
            transactionDeleted: t.transactionDeleted,
            orderStatus: t.orderStatus,
          })),
        },
        new: {
          version: newVersion,
          hash: newHash,
          transactionCount: transactions.length,
          transactions: transactions.map((t: any) => ({
            transactionID: t.TransactionID,
            menuItemText: t.MenuItemText,
            accountingCode: t.AccountingCode,
            quantity: parseFloat(t.Quantity),
            extendedPrice: parseFloat(t.ExtendedPrice),
            amountDue: parseFloat(t.AmountDue),
            lineSubTotal: parseFloat(t.LineSubTotal),
            lineTaxTotal: parseFloat(t.LineTaxTotal),
            lineTotal: parseFloat(t.LineTotal),
            headerDeleted: Boolean(t.HeaderDeleted),
            transactionDeleted: Boolean(t.TransactionDeleted),
            orderStatus: parseInt(t.OrderStatus),
          })),
        },
      },
    };
  }

  await prisma.salesChangeLog.create({
    data: {
      orderKey,
      changeType,
      oldHash: existing?.orderHash || null,
      newHash,
      oldVersion: existing?.version || null,
      newVersion,
      syncBatchId,
      detectedAt: new Date(),
      changedFields: changedFields.length > 0 ? changedFields.join(', ') : null,
      orderSnapshot: orderSnapshot ? JSON.stringify(orderSnapshot) : null,
    },
  });

  return isNew ? 'NEW' : 'UPDATED';
}

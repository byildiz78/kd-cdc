import { prisma } from '@/lib/prisma';
import {
  groupBySummaryKey,
  calculateSummaryFromGroup,
  stringToSummaryKey,
  calculateOrderContribution,
} from './grouping.service';
import { calculateSummaryHash } from './hash.service';

/**
 * Summary tablosunu güncelle
 */
export async function updateSummaries(syncBatchId: string): Promise<void> {
  // Bu batch'de etkilenen OrderKey'leri bul
  const changedOrders = await prisma.salesChangeLog.findMany({
    where: { syncBatchId },
    select: { orderKey: true },
  });

  const orderKeys = changedOrders.map((c) => c.orderKey);

  if (orderKeys.length === 0) {
    return;
  }

  // Etkilenen transaction'ları çek
  const affectedTransactions = await prisma.salesRaw.findMany({
    where: {
      orderKey: { in: orderKeys },
      isLatest: true,
    },
  });

  // Summary key'e göre grupla
  const summaryGroups = groupBySummaryKey(affectedTransactions);

  // Her grup için summary hesapla ve kaydet
  for (const [keyString, transactions] of summaryGroups) {
    const key = stringToSummaryKey(keyString);
    const summary = calculateSummaryFromGroup(transactions);
    const summaryHash = calculateSummaryHash(summary);

    // Null değerleri empty string'e çevir (Prisma unique constraint için)
    const mainAccCode = key.mainAccountingCode || '';
    const accCode = key.accountingCode || '';

    // Mevcut summary'yi bul
    const existing = await prisma.salesSummary.findUnique({
      where: {
        sheetDate_branchCode_accountingCode_isMainCombo_taxPercent_mainAccountingCode: {
          sheetDate: key.sheetDate,
          branchCode: key.branchCode,
          accountingCode: accCode,
          isMainCombo: key.isMainCombo,
          taxPercent: key.taxPercent,
          mainAccountingCode: mainAccCode,
        },
      },
    });

    // Upsert
    await prisma.salesSummary.upsert({
      where: {
        sheetDate_branchCode_accountingCode_isMainCombo_taxPercent_mainAccountingCode: {
          sheetDate: key.sheetDate,
          branchCode: key.branchCode,
          accountingCode: accCode,
          isMainCombo: key.isMainCombo,
          taxPercent: key.taxPercent,
          mainAccountingCode: mainAccCode,
        },
      },
      update: {
        quantity: summary.quantity,
        subTotal: summary.subTotal,
        taxTotal: summary.taxTotal,
        total: summary.total,
        version: (existing?.version || 0) + 1,
        dataHash: summaryHash,
        lastModified: new Date(),
        lastSyncBatchId: syncBatchId,
      },
      create: {
        sheetDate: key.sheetDate,
        mainAccountingCode: mainAccCode,
        accountingCode: accCode,
        isMainCombo: key.isMainCombo,
        taxPercent: key.taxPercent,
        branchID: key.branchID,
        branchCode: key.branchCode,
        isExternal: key.isExternal,
        quantity: summary.quantity,
        subTotal: summary.subTotal,
        taxTotal: summary.taxTotal,
        total: summary.total,
        version: 1,
        dataHash: summaryHash,
        lastSyncBatchId: syncBatchId,
      },
    });
  }
}

/**
 * ⭐ Snapshot-aware delta kayıtları oluştur
 * ERP çekmeden önce: Delta oluşmaz (PRE_SNAPSHOT)
 * ERP çektikten sonra: Delta oluşur (POST_SNAPSHOT)
 */
export async function createDeltaRecords(
  syncBatchId: string,
  companyId: string
): Promise<void> {
  // Son ERP snapshot'ı bul
  const lastSnapshot = await prisma.eRPSnapshot.findFirst({
    where: { companyId },
    orderBy: { snapshotDate: 'desc' },
  });

  // Bu batch'de değişen change log'ları al
  const changes = await prisma.salesChangeLog.findMany({
    where: {
      syncBatchId,
      changeType: { in: ['UPDATED', 'REIMPORTED', 'CREATED'] },
    },
  });

  if (changes.length === 0) {
    return;
  }

  const orderKeys = changes.map((c) => c.orderKey);

  // Yeni ve eski transaction'ları al
  const newTransactions = await prisma.salesRaw.findMany({
    where: {
      orderKey: { in: orderKeys },
      isLatest: true,
    },
  });

  const oldVersions = changes
    .map((c) => c.oldVersion)
    .filter((v) => v !== null) as number[];

  const oldTransactions =
    oldVersions.length > 0
      ? await prisma.salesRaw.findMany({
          where: {
            orderKey: { in: orderKeys },
            isLatest: false,
            version: { in: oldVersions },
          },
        })
      : [];

  // Summary key'e göre grupla
  const newGroups = groupBySummaryKey(newTransactions);
  const oldGroups = groupBySummaryKey(oldTransactions);

  // Her yeni grup için delta oluştur
  for (const [keyString, newTxs] of newGroups) {
    const key = stringToSummaryKey(keyString);
    const oldTxs = oldGroups.get(keyString) || [];

    const newSummary = calculateSummaryFromGroup(newTxs);
    const oldSummary = oldTxs.length > 0 ? calculateSummaryFromGroup(oldTxs) : null;

    // ⭐ Bu değişiklik snapshot öncesi mi sonrası mı?
    const isPreSnapshot =
      !lastSnapshot || new Date(newTxs[0].createdAt) <= lastSnapshot.snapshotDate;

    // ⭐ Pre-snapshot ise delta oluşturma
    if (isPreSnapshot) {
      console.log(
        `[Delta] Pre-snapshot change for ${key.sheetDate}/${key.accountingCode}, merged into summary`
      );
      continue;
    }

    // ⭐ Post-snapshot ise delta oluştur
    const delta = await prisma.salesSummaryDelta.create({
      data: {
        sheetDate: key.sheetDate,
        mainAccountingCode: key.mainAccountingCode || '',
        accountingCode: key.accountingCode,
        isMainCombo: key.isMainCombo,
        taxPercent: key.taxPercent,
        branchID: key.branchID,
        branchCode: key.branchCode,
        isExternal: key.isExternal,
        changeType: oldSummary ? 'UPDATE' : 'INSERT',
        oldQuantity: oldSummary?.quantity,
        oldSubTotal: oldSummary?.subTotal,
        oldTaxTotal: oldSummary?.taxTotal,
        oldTotal: oldSummary?.total,
        newQuantity: newSummary.quantity,
        newSubTotal: newSummary.subTotal,
        newTaxTotal: newSummary.taxTotal,
        newTotal: newSummary.total,
        syncBatchId,
        changedAt: new Date(),
        snapshotId: lastSnapshot.id,
        deltaType: 'POST_SNAPSHOT',
      },
    });

    // Bu delta'ya sebep olan order'ları kaydet
    const affectedOrderKeys = new Set(newTxs.map((tx) => tx.orderKey));

    for (const orderKey of affectedOrderKeys) {
      const change = changes.find((c) => c.orderKey === orderKey)!;
      const orderTxs = newTxs.filter((tx) => tx.orderKey === orderKey);
      const orderContribution = calculateOrderContribution(orderTxs, key);

      await prisma.deltaAffectedOrder.create({
        data: {
          deltaId: delta.id,
          orderKey,
          changeType: change.changeType,
          orderDateTime: orderTxs[0].orderDateTime,
          importDate: orderTxs[0].importDate,
          orderQuantity: orderContribution.quantity,
          orderSubTotal: orderContribution.subTotal,
          orderTaxTotal: orderContribution.taxTotal,
          orderTotal: orderContribution.total,
          oldVersion: change.oldVersion,
          newVersion: change.newVersion,
          oldHash: change.oldHash,
          newHash: change.newHash,
        },
      });
    }
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, companyId: true },
    });

    if (!user || !user.companyId) {
      return NextResponse.json({ error: 'Company user required' }, { status: 403 });
    }

    const { id } = params;

    const delta = await prisma.salesSummaryDelta.findUnique({
      where: { id },
      include: {
        snapshot: {
          select: {
            id: true,
            snapshotDate: true,
            dataStartDate: true,
            dataEndDate: true,
            recordCount: true,
          },
        },
        affectedOrders: {
          orderBy: { orderDateTime: 'desc' },
        },
      },
    });

    if (!delta) {
      return NextResponse.json({ error: 'Delta not found' }, { status: 404 });
    }

    const deltaMagnitude = {
      quantity: (delta.newQuantity || 0) - (delta.oldQuantity || 0),
      subTotal: (delta.newSubTotal || 0) - (delta.oldSubTotal || 0),
      taxTotal: (delta.newTaxTotal || 0) - (delta.oldTaxTotal || 0),
      total: (delta.newTotal || 0) - (delta.oldTotal || 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        id: delta.id,
        sheetDate: delta.sheetDate,
        branch: {
          id: delta.branchID,
          code: delta.branchCode,
          isExternal: delta.isExternal,
        },
        accounting: {
          mainCode: delta.mainAccountingCode,
          code: delta.accountingCode,
          isMainCombo: delta.isMainCombo,
        },
        taxPercent: delta.taxPercent,
        changeType: delta.changeType,
        oldValues: delta.oldQuantity !== null ? {
          quantity: delta.oldQuantity,
          subTotal: delta.oldSubTotal,
          taxTotal: delta.oldTaxTotal,
          total: delta.oldTotal,
        } : null,
        newValues: {
          quantity: delta.newQuantity,
          subTotal: delta.newSubTotal,
          taxTotal: delta.newTaxTotal,
          total: delta.newTotal,
        },
        deltaMagnitude,
        snapshot: delta.snapshot,
        affectedOrders: delta.affectedOrders.map((order) => ({
          orderKey: order.orderKey,
          changeType: order.changeType,
          orderDateTime: order.orderDateTime,
          importDate: order.importDate,
          contribution: {
            quantity: order.orderQuantity,
            subTotal: order.orderSubTotal,
            taxTotal: order.orderTaxTotal,
            total: order.orderTotal,
          },
          version: {
            old: order.oldVersion,
            new: order.newVersion,
          },
          hash: {
            old: order.oldHash,
            new: order.newHash,
          },
        })),
        metadata: {
          deltaType: delta.deltaType,
          changedAt: delta.changedAt,
          syncBatchId: delta.syncBatchId,
          processed: delta.processed,
          processedAt: delta.processedAt,
        },
      },
    });
  } catch (error) {
    console.error('[API] Fetch delta detail failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

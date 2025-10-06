import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const snapshotId = searchParams.get('snapshotId');
    const includeProcessed = searchParams.get('includeProcessed') === 'true';

    const where: any = {
      deltaType: 'POST_SNAPSHOT',
    };

    if (snapshotId) {
      where.snapshotId = snapshotId;
    }

    if (!includeProcessed) {
      where.processed = false;
    }

    const deltas = await prisma.salesSummaryDelta.findMany({
      where,
      include: {
        snapshot: {
          select: {
            id: true,
            snapshotDate: true,
            dataStartDate: true,
            dataEndDate: true,
          },
        },
        affectedOrders: {
          select: {
            orderKey: true,
            changeType: true,
            orderDateTime: true,
            orderQuantity: true,
            orderTotal: true,
          },
        },
      },
      orderBy: { changedAt: 'desc' },
    });

    const groupedBySnapshot = deltas.reduce((acc: any, delta) => {
      const sid = delta.snapshotId || 'none';
      if (!acc[sid]) {
        acc[sid] = {
          snapshot: delta.snapshot,
          deltas: [],
        };
      }
      acc[sid].deltas.push(delta);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        totalDeltas: deltas.length,
        unprocessedCount: deltas.filter((d) => !d.processed).length,
        snapshots: Object.values(groupedBySnapshot).map((group: any) => ({
          snapshot: group.snapshot,
          deltaCount: group.deltas.length,
          deltas: group.deltas.map((d: any) => ({
            id: d.id,
            sheetDate: d.sheetDate,
            branch: {
              id: d.branchID,
              code: d.branchCode,
              isExternal: d.isExternal,
            },
            accounting: {
              mainCode: d.mainAccountingCode,
              code: d.accountingCode,
              isMainCombo: d.isMainCombo,
            },
            taxPercent: d.taxPercent,
            changeType: d.changeType,
            oldValues: d.oldQuantity !== null ? {
              quantity: d.oldQuantity,
              subTotal: d.oldSubTotal,
              taxTotal: d.oldTaxTotal,
              total: d.oldTotal,
            } : null,
            newValues: {
              quantity: d.newQuantity,
              subTotal: d.newSubTotal,
              taxTotal: d.newTaxTotal,
              total: d.newTotal,
            },
            affectedOrderCount: d.affectedOrders.length,
            metadata: {
              changedAt: d.changedAt,
              syncBatchId: d.syncBatchId,
              processed: d.processed,
              processedAt: d.processedAt,
            },
          })),
        })),
      },
    });
  } catch (error) {
    console.error('[API] Fetch deltas failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

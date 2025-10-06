import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true },
    });

    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin only' }, { status: 403 });
    }

    console.log('[DB Operations] Starting deletion of all sync data...');

    // Delete in correct order (respecting foreign key constraints)
    // 1. Delete DeltaAffectedOrder (references SalesSummaryDelta)
    const deletedAffectedOrders = await prisma.deltaAffectedOrder.deleteMany({});
    console.log(`[DB Operations] Deleted ${deletedAffectedOrders.count} affected orders`);

    // 2. Delete SalesSummaryDelta
    const deletedDeltas = await prisma.salesSummaryDelta.deleteMany({});
    console.log(`[DB Operations] Deleted ${deletedDeltas.count} delta records`);

    // 3. Delete ERPSnapshot
    const deletedSnapshots = await prisma.eRPSnapshot.deleteMany({});
    console.log(`[DB Operations] Deleted ${deletedSnapshots.count} ERP snapshots`);

    // 4. Delete SalesSummary
    const deletedSummary = await prisma.salesSummary.deleteMany({});
    console.log(`[DB Operations] Deleted ${deletedSummary.count} summary records`);

    // 5. Delete SalesRaw
    const deletedRaw = await prisma.salesRaw.deleteMany({});
    console.log(`[DB Operations] Deleted ${deletedRaw.count} raw records`);

    // 6. Delete SalesChangeLog
    const deletedChangeLogs = await prisma.salesChangeLog.deleteMany({});
    console.log(`[DB Operations] Deleted ${deletedChangeLogs.count} change logs`);

    // 7. Delete SyncBatch
    const deletedBatches = await prisma.syncBatch.deleteMany({});
    console.log(`[DB Operations] Deleted ${deletedBatches.count} sync batches`);

    const details = {
      deletedAffectedOrders: deletedAffectedOrders.count,
      deletedDeltas: deletedDeltas.count,
      deletedSnapshots: deletedSnapshots.count,
      deletedSummary: deletedSummary.count,
      deletedRaw: deletedRaw.count,
      deletedChangeLogs: deletedChangeLogs.count,
      deletedBatches: deletedBatches.count,
    };

    console.log('[DB Operations] All sync data deleted successfully', details);

    return NextResponse.json({
      success: true,
      message: 'Tum senkronizasyon verileri basariyla silindi',
      details,
    });
  } catch (error) {
    console.error('[DB Operations] Delete all failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Silme islemi basarisiz oldu',
      },
      { status: 500 }
    );
  }
}

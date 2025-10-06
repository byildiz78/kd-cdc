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

    console.log('[DB Operations] Starting deletion of log data...');

    // Delete SalesChangeLog first (FK dependency on SyncBatch)
    const deletedChangeLogs = await prisma.salesChangeLog.deleteMany({});
    console.log(`[DB Operations] Deleted ${deletedChangeLogs.count} change logs`);

    // Delete SyncBatch
    const deletedBatches = await prisma.syncBatch.deleteMany({});
    console.log(`[DB Operations] Deleted ${deletedBatches.count} sync batches`);

    // Delete ERP API Logs
    const deletedErpApiLogs = await prisma.eRPApiLog.deleteMany({});
    console.log(`[DB Operations] Deleted ${deletedErpApiLogs.count} ERP API logs`);

    return NextResponse.json({
      success: true,
      message: `${deletedChangeLogs.count} change log, ${deletedBatches.count} sync batch ve ${deletedErpApiLogs.count} ERP API log kaydi silindi`,
      details: {
        deletedChangeLogs: deletedChangeLogs.count,
        deletedBatches: deletedBatches.count,
        deletedErpApiLogs: deletedErpApiLogs.count,
      },
    });
  } catch (error) {
    console.error('[DB Operations] Delete logs failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Silme islemi basarisiz oldu',
      },
      { status: 500 }
    );
  }
}

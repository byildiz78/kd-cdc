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

    console.log('[DB Operations] Starting deletion of delta data...');

    // Delete DeltaAffectedOrder first (FK dependency)
    const deletedAffectedOrders = await prisma.deltaAffectedOrder.deleteMany({});
    console.log(`[DB Operations] Deleted ${deletedAffectedOrders.count} affected orders`);

    // Delete SalesSummaryDelta
    const deletedDeltas = await prisma.salesSummaryDelta.deleteMany({});
    console.log(`[DB Operations] Deleted ${deletedDeltas.count} delta records`);

    return NextResponse.json({
      success: true,
      message: `${deletedDeltas.count} delta kaydi ve ${deletedAffectedOrders.count} etkilenen order silindi`,
      details: {
        deletedDeltas: deletedDeltas.count,
        deletedAffectedOrders: deletedAffectedOrders.count,
      },
    });
  } catch (error) {
    console.error('[DB Operations] Delete delta failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Silme islemi basarisiz oldu',
      },
      { status: 500 }
    );
  }
}

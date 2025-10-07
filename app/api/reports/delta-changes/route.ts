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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const deltaType = searchParams.get('deltaType');
    const processedParam = searchParams.get('processed');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    // Build where clause for delta
    const deltaWhere: any = {};

    // Date range filter on changedAt
    if (startDate && endDate) {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);

      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      deltaWhere.changedAt = {
        gte: startDateTime,
        lte: endDateTime,
      };
    }

    // Delta type filter
    if (deltaType) {
      deltaWhere.deltaType = deltaType;
    }

    // Processed filter
    if (processedParam !== null && processedParam !== '') {
      deltaWhere.processed = processedParam === 'true';
    }

    // Company filter - need to filter by syncBatch
    let deltas;
    if (user.role !== 'SUPERADMIN' && user.companyId) {
      // Get batches for this company
      const batches = await prisma.syncBatch.findMany({
        where: { companyId: user.companyId },
        select: { id: true },
      });
      const batchIds = batches.map((b) => b.id);

      if (batchIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            records: [],
            stats: { totalDeltas: 0, processedDeltas: 0, pendingDeltas: 0 },
          },
        });
      }

      deltaWhere.syncBatchId = { in: batchIds };
    }

    const totalRecords = await prisma.salesSummaryDelta.count({ where: deltaWhere });

    deltas = await prisma.salesSummaryDelta.findMany({
      where: deltaWhere,
      orderBy: {
        changedAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Calculate stats from ALL records (not just current page)
    const allDeltas = await prisma.salesSummaryDelta.findMany({
      where: deltaWhere,
      select: { processed: true },
    });
    const totalDeltas = allDeltas.length;
    const processedDeltas = allDeltas.filter((d) => d.processed).length;
    const pendingDeltas = totalDeltas - processedDeltas;

    return NextResponse.json({
      success: true,
      data: {
        records: deltas,
        totalRecords,
        currentPage: page,
        pageSize,
        totalPages: Math.ceil(totalRecords / pageSize),
        stats: {
          totalDeltas,
          processedDeltas,
          pendingDeltas,
        },
      },
    });
  } catch (error) {
    console.error('[API] Fetch delta changes failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

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
    const companyId = searchParams.get('companyId');

    // Build where clause for change logs
    const changeLogWhere: any = {
      changeType: {
        in: ['UPDATED', 'REIMPORTED'], // Only updated records, not new ones
      },
    };

    // Get company filter via sync batch
    const batchWhere: any = {};
    if (user.role !== 'SUPERADMIN') {
      batchWhere.companyId = user.companyId;
    } else if (companyId) {
      batchWhere.companyId = companyId;
    }

    // Date range filter on detectedAt
    if (startDate && endDate) {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);

      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      changeLogWhere.detectedAt = {
        gte: startDateTime,
        lte: endDateTime,
      };
    }

    // If we need to filter by company, we need to join through syncBatch
    let changeLogs;
    if (Object.keys(batchWhere).length > 0) {
      // Get batches first
      const batches = await prisma.syncBatch.findMany({
        where: batchWhere,
        select: { id: true },
      });
      const batchIds = batches.map((b) => b.id);

      if (batchIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            records: [],
            stats: { totalUpdated: 0, totalOrders: 0 },
          },
        });
      }

      changeLogWhere.syncBatchId = { in: batchIds };
    }

    changeLogs = await prisma.salesChangeLog.findMany({
      where: changeLogWhere,
      include: {
        batch: {
          select: {
            company: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        detectedAt: 'desc',
      },
      take: 500,
    });

    // Get orderDateTime from SalesRaw for each orderKey
    const orderKeys = changeLogs.map((log) => log.orderKey);
    const salesRawRecords = await prisma.salesRaw.findMany({
      where: {
        orderKey: { in: orderKeys },
        isLatest: true,
      },
      select: {
        orderKey: true,
        orderDateTime: true,
      },
    });

    // Create a map for quick lookup
    const orderDateTimeMap = new Map(
      salesRawRecords.map((record) => [record.orderKey, record.orderDateTime])
    );

    const recordsWithHistory = changeLogs.map((log) => ({
      orderKey: log.orderKey,
      orderDateTime: orderDateTimeMap.get(log.orderKey),
      newVersion: log.newVersion,
      oldVersion: log.oldVersion || 0,
      newHash: log.newHash,
      oldHash: log.oldHash || '',
      updatedAt: log.detectedAt,
      changeType: log.changeType,
      changedFields: log.changedFields,
      orderSnapshot: log.orderSnapshot ? JSON.parse(log.orderSnapshot) : null,
      companyName: log.batch?.company?.name,
    }));

    // Calculate stats
    const totalUpdated = recordsWithHistory.length;
    const uniqueOrders = new Set(recordsWithHistory.map((r) => r.orderKey)).size;

    return NextResponse.json({
      success: true,
      data: {
        records: recordsWithHistory,
        stats: {
          totalUpdated,
          totalOrders: uniqueOrders,
        },
      },
    });
  } catch (error) {
    console.error('[API] Fetch updated records failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

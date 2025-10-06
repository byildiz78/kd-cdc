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
    const status = searchParams.get('status');
    const companyId = searchParams.get('companyId');

    const where: any = {};

    // Filter by user's company if not SuperAdmin
    if (user.role !== 'SUPERADMIN') {
      if (!user.companyId) {
        return NextResponse.json({ success: true, data: [] });
      }
      where.companyId = user.companyId;
    } else if (companyId) {
      where.companyId = companyId;
    }

    // Date range filter on startedAt
    if (startDate && endDate) {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);

      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      where.startedAt = {
        gte: startDateTime,
        lte: endDateTime,
      };
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    const batches = await prisma.syncBatch.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 100,
    });

    const formattedData = batches.map((batch) => ({
      id: batch.id,
      company: batch.company,
      status: batch.status,
      startDate: batch.startDate,
      endDate: batch.endDate,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      totalRecords: batch.totalRecords,
      newRecords: batch.newRecords,
      updatedRecords: batch.updatedRecords,
      unchangedRecords: batch.unchangedRecords,
      duration: batch.completedAt && batch.startedAt
        ? batch.completedAt.getTime() - batch.startedAt.getTime()
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error('[API] Fetch sync logs failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

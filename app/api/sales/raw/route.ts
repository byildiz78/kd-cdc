import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session) {
      console.log('[API /sales/raw] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, companyId: true },
    });

    if (!user || !user.companyId) {
      console.log('[API /sales/raw] Forbidden - no company');
      return NextResponse.json({ error: 'Company user required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branchCode = searchParams.get('branchCode');
    const orderKey = searchParams.get('orderKey');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('[API /sales/raw] Filters:', { startDate, endDate, branchCode, orderKey, page, limit });

    const where: any = {
      isLatest: true,
    };

    if (startDate && endDate) {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);

      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      where.orderDateTime = {
        gte: startDateTime,
        lte: endDateTime,
      };
    }

    if (branchCode) {
      where.branchCode = branchCode;
    }

    if (orderKey) {
      where.orderKey = {
        contains: orderKey,
      };
    }

    const [records, total] = await Promise.all([
      prisma.salesRaw.findMany({
        where,
        orderBy: [{ orderDateTime: 'desc' }, { orderKey: 'asc' }],
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.salesRaw.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    console.log('[API /sales/raw] Found:', total, 'records, returning page', page, 'with', records.length, 'items');

    return NextResponse.json({
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('[API] Fetch raw data failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

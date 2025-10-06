import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncSalesData } from '@/lib/services/sync.service';
import { verifySession } from '@/lib/auth';

/**
 * POST /api/sync
 * Manuel sync başlat (SuperAdmin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await verifySession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin only' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { companyId, startDate, endDate } = body;

    // Validate required fields
    if (!companyId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId, startDate, endDate' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    if (!dateRegex.test(startDate) && !dateTimeRegex.test(startDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD or YYYY-MM-DD HH:MM:SS' },
        { status: 400 }
      );
    }
    if (!dateRegex.test(endDate) && !dateTimeRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD or YYYY-MM-DD HH:MM:SS' },
        { status: 400 }
      );
    }

    // Validate company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Start sync
    console.log(`[API] Starting manual sync for ${company.code} (${startDate} - ${endDate})`);

    const result = await syncSalesData({
      companyId,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: {
        batchId: result.batchId,
        company: company.code,
        dateRange: { startDate, endDate },
        statistics: {
          totalRecords: result.totalRecords,
          newRecords: result.newRecords,
          updatedRecords: result.updatedRecords,
          unchangedRecords: result.unchangedRecords,
        },
        duration: result.duration,
      },
    });
  } catch (error) {
    console.error('[API] Sync failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

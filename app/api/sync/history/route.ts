import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

/**
 * GET /api/sync/history
 * Sync batch history (with company filter for non-SuperAdmin)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const offset = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};

    // Non-SuperAdmin can only see their own company
    if (user.role !== 'SUPERADMIN') {
      where.companyId = user.companyId;
    } else if (companyId) {
      where.companyId = companyId;
    }

    if (status) {
      where.status = status;
    }

    // Fetch batches with company info
    const [batches, total] = await Promise.all([
      prisma.syncBatch.findMany({
        where,
        include: {
          company: {
            select: { code: true, name: true },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: pageSize,
        skip: offset,
      }),
      prisma.syncBatch.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalRecords: total,
        currentPage: page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        batches: batches.map((batch) => ({
          id: batch.id,
          company: {
            id: batch.companyId,
            code: batch.company.code,
            name: batch.company.name,
          },
          dateRange: {
            startDate: batch.startDate,
            endDate: batch.endDate,
          },
          status: batch.status,
          statistics: {
            totalRecords: batch.totalRecords,
            newRecords: batch.newRecords,
            updatedRecords: batch.updatedRecords,
            unchangedRecords: batch.unchangedRecords,
          },
          timing: {
            startedAt: batch.startedAt,
            completedAt: batch.completedAt,
            duration: batch.duration,
          },
          error: batch.errorMessage
            ? {
                message: batch.errorMessage,
                details: batch.errorDetails,
              }
            : null,
        })),
      },
    });
  } catch (error) {
    console.error('[API] Fetch sync history failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

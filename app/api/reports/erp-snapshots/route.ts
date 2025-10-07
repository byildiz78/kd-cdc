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
    const status = searchParams.get('status');
    const companyId = searchParams.get('companyId');

    // Build where clause
    const where: any = {};

    // Status filter
    if (status) {
      where.erpStatus = status;
    }

    // Company filter
    if (user.role !== 'SUPERADMIN' && user.companyId) {
      where.companyId = user.companyId;
    } else if (companyId) {
      where.companyId = companyId;
    }

    // Fetch snapshots
    const snapshots = await prisma.eRPSnapshot.findMany({
      where,
      include: {
        company: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        snapshotDate: 'desc',
      },
      take: 100,
    });

    const records = snapshots.map((snapshot) => ({
      id: snapshot.id,
      companyName: snapshot.company.name,
      companyCode: snapshot.company.code,
      snapshotDate: snapshot.snapshotDate,
      dataStartDate: snapshot.dataStartDate,
      dataEndDate: snapshot.dataEndDate,
      recordCount: snapshot.recordCount,
      deltaCount: snapshot.deltaCount,
      erpStatus: snapshot.erpStatus || 'PENDING',
      erpPulledAt: snapshot.erpPulledAt,
      erpConfirmedAt: snapshot.erpConfirmedAt,
      erpRecordCount: snapshot.erpRecordCount,
      erpDeltaCount: snapshot.erpDeltaCount,
      erpErrorMessage: snapshot.erpErrorMessage,
    }));

    return NextResponse.json({
      success: true,
      data: {
        records,
        count: records.length,
      },
    });
  } catch (error) {
    console.error('[API] Fetch ERP snapshots failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

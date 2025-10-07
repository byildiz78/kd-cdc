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

    if (!user || !user.companyId) {
      return NextResponse.json({ error: 'Company user required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branchCode = searchParams.get('branchCode');
    const accountingCode = searchParams.get('accountingCode');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required params: startDate, endDate' },
        { status: 400 }
      );
    }

    const where: any = {
      sheetDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (branchCode) {
      where.branchCode = branchCode;
    }

    if (accountingCode) {
      where.accountingCode = accountingCode;
    }

    const summaries = await prisma.salesSummary.findMany({
      where,
      orderBy: [{ sheetDate: 'asc' }, { branchCode: 'asc' }, { accountingCode: 'asc' }],
    });

    const totals = summaries.reduce(
      (acc, s) => ({
        quantity: acc.quantity + s.quantity,
        subTotal: acc.subTotal + s.subTotal,
        taxTotal: acc.taxTotal + s.taxTotal,
        total: acc.total + s.total,
      }),
      { quantity: 0, subTotal: 0, taxTotal: 0, total: 0 }
    );

    return NextResponse.json({
      success: true,
      data: {
        dateRange: { startDate, endDate },
        recordCount: summaries.length,
        totals,
        records: summaries.map((s) => ({
          sheetDate: s.sheetDate,
          branch: {
            id: s.branchID,
            code: s.branchCode,
            isExternal: s.isExternal,
          },
          accounting: {
            mainCode: s.mainAccountingCode,
            code: s.accountingCode,
            isMainCombo: s.isMainCombo,
          },
          taxPercent: s.taxPercent,
          values: {
            quantity: s.quantity,
            subTotal: s.subTotal,
            taxTotal: s.taxTotal,
            total: s.total,
          },
          metadata: {
            version: s.version,
            dataHash: s.dataHash,
            lastModified: s.lastModified,
            lastSyncBatchId: s.lastSyncBatchId,
          },
        })),
      },
    });
  } catch (error) {
    console.error('[API] Fetch summary failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

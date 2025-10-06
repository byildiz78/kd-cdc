import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { deltaIds, startDate, endDate } = body;

    if (!Array.isArray(deltaIds) || deltaIds.length === 0) {
      return NextResponse.json(
        { error: 'deltaIds array required' },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: startDate, endDate' },
        { status: 400 }
      );
    }

    const deltas = await prisma.salesSummaryDelta.findMany({
      where: {
        id: { in: deltaIds },
      },
    });

    if (deltas.length !== deltaIds.length) {
      return NextResponse.json(
        { error: 'Some delta IDs not found' },
        { status: 404 }
      );
    }

    const alreadyProcessed = deltas.filter((d) => d.processed);
    if (alreadyProcessed.length > 0) {
      return NextResponse.json(
        {
          error: 'Some deltas already processed',
          processedIds: alreadyProcessed.map((d) => d.id),
        },
        { status: 400 }
      );
    }

    const snapshot = await prisma.eRPSnapshot.create({
      data: {
        companyId: user.companyId,
        snapshotDate: new Date(),
        dataStartDate: startDate,
        dataEndDate: endDate,
        recordCount: 0,
        deltaCount: deltaIds.length,
      },
    });

    const processedAt = new Date();
    await prisma.salesSummaryDelta.updateMany({
      where: {
        id: { in: deltaIds },
      },
      data: {
        processed: true,
        processedAt,
        snapshotId: snapshot.id,
      },
    });

    const summaryCount = await prisma.salesSummary.count({
      where: {
        sheetDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    await prisma.eRPSnapshot.update({
      where: { id: snapshot.id },
      data: { recordCount: summaryCount },
    });

    console.log(
      `[API] Created ERP snapshot ${snapshot.id} with ${deltaIds.length} deltas, ${summaryCount} summary records`
    );

    return NextResponse.json({
      success: true,
      data: {
        snapshot: {
          id: snapshot.id,
          snapshotDate: snapshot.snapshotDate,
          dataStartDate: snapshot.dataStartDate,
          dataEndDate: snapshot.dataEndDate,
          recordCount: summaryCount,
          deltaCount: snapshot.deltaCount,
        },
        processedDeltaCount: deltaIds.length,
        processedAt,
      },
    });
  } catch (error) {
    console.error('[API] Mark processed failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

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

    console.log('[DB Operations] Starting deletion of summary data...');

    const deletedSummary = await prisma.salesSummary.deleteMany({});
    console.log(`[DB Operations] Deleted ${deletedSummary.count} summary records`);

    return NextResponse.json({
      success: true,
      message: `${deletedSummary.count} ozet veri kaydi silindi`,
      details: { deletedSummary: deletedSummary.count },
    });
  } catch (error) {
    console.error('[DB Operations] Delete summary failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Silme islemi basarisiz oldu',
      },
      { status: 500 }
    );
  }
}

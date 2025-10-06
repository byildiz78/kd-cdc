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

    console.log('[DB Operations] Starting deletion of raw data...');

    const deletedRaw = await prisma.salesRaw.deleteMany({});
    console.log(`[DB Operations] Deleted ${deletedRaw.count} raw records`);

    return NextResponse.json({
      success: true,
      message: `${deletedRaw.count} ham veri kaydi silindi`,
      details: { deletedRaw: deletedRaw.count },
    });
  } catch (error) {
    console.error('[DB Operations] Delete raw failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Silme islemi basarisiz oldu',
      },
      { status: 500 }
    );
  }
}

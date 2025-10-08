import { NextRequest, NextResponse } from 'next/server';
import { getWorkerStatus } from '@/lib/workers/init';
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

    // Get worker status
    const workerStatus = getWorkerStatus();

    // Get companies with sync info
    const where: any = { isActive: true };
    if (user.role !== 'SUPERADMIN' && user.companyId) {
      where.id = user.companyId;
    }

    const companies = await prisma.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        syncType: true,
        syncEnabled: true,
        syncIntervalMinutes: true,
        lastSyncAt: true,
        dailySyncHour: true,
        dailySyncMinute: true,
        weeklySyncDay: true,
        weeklySyncHour: true,
        weeklySyncMinute: true,
      },
    });

    // Calculate next sync time for each company
    const now = new Date();
    const companiesWithNextSync = companies.map(company => {
      let nextSyncAt: Date | null = null;
      let nextSyncReason = '';

      if (!company.syncEnabled) {
        return {
          ...company,
          nextSyncAt: null,
          nextSyncReason: 'Devre dışı',
          minutesUntilNextSync: null,
        };
      }

      switch (company.syncType) {
        case 'INTERVAL':
          if (company.lastSyncAt && company.syncIntervalMinutes) {
            nextSyncAt = new Date(company.lastSyncAt);
            nextSyncAt.setMinutes(nextSyncAt.getMinutes() + company.syncIntervalMinutes);
            nextSyncReason = `Her ${company.syncIntervalMinutes} dakikada`;
          } else {
            nextSyncReason = 'İlk sync bekleniyor';
          }
          break;

        case 'DAILY':
          nextSyncAt = new Date(now);
          nextSyncAt.setHours(company.dailySyncHour, company.dailySyncMinute, 0, 0);
          if (nextSyncAt <= now) {
            nextSyncAt.setDate(nextSyncAt.getDate() + 1);
          }
          nextSyncReason = `Her gün ${String(company.dailySyncHour).padStart(2, '0')}:${String(company.dailySyncMinute).padStart(2, '0')}`;
          break;

        case 'WEEKLY':
          nextSyncAt = new Date(now);
          const daysUntilTarget = (company.weeklySyncDay - now.getDay() + 7) % 7;
          nextSyncAt.setDate(nextSyncAt.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
          nextSyncAt.setHours(company.weeklySyncHour, company.weeklySyncMinute, 0, 0);

          const weekDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
          nextSyncReason = `Her ${weekDays[company.weeklySyncDay]} ${String(company.weeklySyncHour).padStart(2, '0')}:${String(company.weeklySyncMinute).padStart(2, '0')}`;
          break;
      }

      const minutesUntilNextSync = nextSyncAt
        ? Math.floor((nextSyncAt.getTime() - now.getTime()) / 60000)
        : null;

      return {
        ...company,
        nextSyncAt,
        nextSyncReason,
        minutesUntilNextSync,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        worker: workerStatus,
        companies: companiesWithNextSync,
        serverTime: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('[API] Worker status failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get worker status',
      },
      { status: 500 }
    );
  }
}

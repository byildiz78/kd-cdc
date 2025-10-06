import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Dashboard için gerekli tüm istatistikleri döner (sync stats, ERP API stats, recent activity)
 *     tags:
 *       - Dashboard
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Başarılı response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRecords:
 *                       type: integer
 *                       description: Toplam OrderKey sayısı
 *                     transferredRecords:
 *                       type: integer
 *                       description: Başarılı sync sayısı
 *                     failedRecords:
 *                       type: integer
 *                       description: Başarısız sync sayısı
 *                     todayTransfers:
 *                       type: integer
 *                       description: Bugünkü değişiklik sayısı
 *                     erpApi:
 *                       type: object
 *                       properties:
 *                         totalCalls:
 *                           type: integer
 *                         successRate:
 *                           type: number
 *                         avgResponseTime:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Toplam OrderKey sayısı (latest)
    const totalRecords = await prisma.salesRaw.count({
      where: { isLatest: true },
    });

    // Bugün eklenen/güncellenen OrderKey sayısı
    const todayChanges = await prisma.salesChangeLog.count({
      where: {
        detectedAt: { gte: todayStart },
      },
    });

    // Bu hafta
    const weekChanges = await prisma.salesChangeLog.count({
      where: {
        detectedAt: { gte: weekStart },
      },
    });

    // Bu ay
    const monthChanges = await prisma.salesChangeLog.count({
      where: {
        detectedAt: { gte: monthStart },
      },
    });

    // Başarılı/başarısız sync sayıları
    const completedBatches = await prisma.syncBatch.count({
      where: { status: 'COMPLETED' },
    });

    const failedBatches = await prisma.syncBatch.count({
      where: { status: 'FAILED' },
    });

    const runningBatches = await prisma.syncBatch.count({
      where: { status: 'RUNNING' },
    });

    // Başarı oranı
    const totalBatches = completedBatches + failedBatches;
    const successRate = totalBatches > 0 ? (completedBatches / totalBatches) * 100 : 100;

    // Ortalama sync süresi (saniye)
    const avgDuration = await prisma.syncBatch.aggregate({
      where: {
        status: 'COMPLETED',
        duration: { not: null },
      },
      _avg: { duration: true },
    });

    const avgTransferTime = avgDuration._avg.duration
      ? Math.round(avgDuration._avg.duration / 1000)
      : 0;

    // Son sync tarihi
    const lastBatch = await prisma.syncBatch.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });

    // Son aktiviteler (son 10 sync)
    const recentBatches = await prisma.syncBatch.findMany({
      where: {
        status: { in: ['COMPLETED', 'FAILED'] },
      },
      include: {
        company: { select: { name: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    const recentActivity = recentBatches.map((batch) => ({
      date: batch.startedAt.toLocaleString('tr-TR'),
      action: batch.status === 'COMPLETED'
        ? `${batch.company.name} - Senkronizasyon tamamlandı`
        : `${batch.company.name} - Senkronizasyon başarısız`,
      count: batch.totalRecords || 0,
      status: batch.status === 'COMPLETED' ? 'success' : 'failed',
    }));

    // ERP API İstatistikleri
    const totalErpApiCalls = await prisma.eRPApiLog.count();

    const todayErpApiCalls = await prisma.eRPApiLog.count({
      where: {
        requestedAt: { gte: todayStart },
      },
    });

    const weekErpApiCalls = await prisma.eRPApiLog.count({
      where: {
        requestedAt: { gte: weekStart },
      },
    });

    const monthErpApiCalls = await prisma.eRPApiLog.count({
      where: {
        requestedAt: { gte: monthStart },
      },
    });

    // Başarılı/başarısız ERP API çağrıları
    const successfulErpApiCalls = await prisma.eRPApiLog.count({
      where: {
        statusCode: { gte: 200, lt: 300 },
      },
    });

    const failedErpApiCalls = await prisma.eRPApiLog.count({
      where: {
        statusCode: { gte: 400 },
      },
    });

    // Ortalama ERP API response time (ms)
    const avgErpResponse = await prisma.eRPApiLog.aggregate({
      where: {
        statusCode: { gte: 200, lt: 300 },
      },
      _avg: { responseTime: true },
    });

    const avgErpResponseTime = avgErpResponse._avg.responseTime
      ? Math.round(avgErpResponse._avg.responseTime)
      : 0;

    // Toplam ERP API'den çekilen kayıt sayısı
    const totalErpRecords = await prisma.eRPApiLog.aggregate({
      _sum: { recordCount: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRecords,
        transferredRecords: completedBatches,
        failedRecords: failedBatches,
        pendingRecords: runningBatches,
        todayTransfers: todayChanges,
        weekTransfers: weekChanges,
        monthTransfers: monthChanges,
        successRate: Math.round(successRate * 10) / 10,
        avgTransferTime,
        lastTransferDate: lastBatch?.completedAt?.toISOString() || new Date().toISOString(),
        recentActivity,
        // ERP API Stats
        erpApi: {
          totalCalls: totalErpApiCalls,
          todayCalls: todayErpApiCalls,
          weekCalls: weekErpApiCalls,
          monthCalls: monthErpApiCalls,
          successfulCalls: successfulErpApiCalls,
          failedCalls: failedErpApiCalls,
          successRate: totalErpApiCalls > 0
            ? Math.round((successfulErpApiCalls / totalErpApiCalls) * 1000) / 10
            : 100,
          avgResponseTime: avgErpResponseTime,
          totalRecordsServed: totalErpRecords._sum.recordCount || 0,
        },
      },
    });
  } catch (error) {
    console.error('[Dashboard Stats] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
      },
      { status: 500 }
    );
  }
}

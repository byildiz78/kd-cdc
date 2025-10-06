import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

/**
 * @swagger
 * /api/reports/erp-api-logs:
 *   get:
 *     summary: Get ERP API usage logs
 *     description: ERP API endpoint kullanım loglarını filtreler ile birlikte döner
 *     tags:
 *       - Reports
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Başlangıç tarihi (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Bitiş tarihi (YYYY-MM-DD)
 *       - in: query
 *         name: companyId
 *         required: false
 *         schema:
 *           type: string
 *         description: Firma ID filtresi
 *       - in: query
 *         name: endpoint
 *         required: false
 *         schema:
 *           type: string
 *           enum: ['/api/erp/sales-summary', '/api/erp/deltas']
 *         description: Endpoint filtresi
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       endpoint:
 *                         type: string
 *                       statusCode:
 *                         type: integer
 *                       responseTime:
 *                         type: integer
 *                       recordCount:
 *                         type: integer
 *                       requestedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const companyId = searchParams.get('companyId');
    const endpoint = searchParams.get('endpoint');

    const where: any = {};

    // Date filter
    if (startDate && endDate) {
      const start = new Date(startDate + ' 00:00:00');
      const end = new Date(endDate + ' 23:59:59');
      where.requestedAt = {
        gte: start,
        lte: end,
      };
    }

    // Company filter
    if (companyId) {
      where.companyId = companyId;
    }

    // Endpoint filter
    if (endpoint) {
      where.endpoint = endpoint;
    }

    const logs = await prisma.eRPApiLog.findMany({
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
        requestedAt: 'desc',
      },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        company: {
          name: log.company.name,
          code: log.company.code,
        },
        endpoint: log.endpoint,
        method: log.method,
        dateRange: {
          startDate: log.startDate,
          endDate: log.endDate,
        },
        filters: log.filters ? JSON.parse(log.filters) : null,
        statusCode: log.statusCode,
        responseTime: log.responseTime,
        recordCount: log.recordCount,
        errorMessage: log.errorMessage,
        requestedAt: log.requestedAt,
      })),
    });
  } catch (error) {
    console.error('[ERP API Logs] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch ERP API logs',
      },
      { status: 500 }
    );
  }
}

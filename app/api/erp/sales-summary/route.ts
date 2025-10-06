import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyERPToken } from '@/lib/auth/erp-auth';

/**
 * @swagger
 * /api/erp/sales-summary:
 *   get:
 *     summary: Get sales summary data for ERP
 *     description: ERP sisteminin özet satış verilerini çekmesi için endpoint. Bearer token ile authentication gerektirir.
 *     tags:
 *       - ERP API
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Başlangıç tarihi (YYYY-MM-DD)
 *         example: "2025-10-01"
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Bitiş tarihi (YYYY-MM-DD)
 *         example: "2025-10-31"
 *       - in: query
 *         name: branchCode
 *         required: false
 *         schema:
 *           type: string
 *         description: Şube kodu filtresi
 *         example: "001"
 *       - in: query
 *         name: accountingCode
 *         required: false
 *         schema:
 *           type: string
 *         description: Muhasebe kodu filtresi
 *         example: "100.01.001"
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
 *                 company:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                     name:
 *                       type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totals:
 *                       type: object
 *                     records:
 *                       type: array
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       400:
 *         description: Bad Request - Missing or invalid parameters
 */
export async function GET(request: NextRequest) {
  const requestStartTime = Date.now();
  let logData: any = {
    endpoint: '/api/erp/sales-summary',
    method: 'GET',
    startDate: '',
    endDate: '',
    filters: null,
    statusCode: 200,
    recordCount: 0,
    errorMessage: null,
  };

  try {
    // Authenticate
    const authResult = await verifyERPToken(request);
    if (!authResult.success) {
      logData.statusCode = 401;
      logData.errorMessage = authResult.error || 'Authentication failed';

      return NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Authentication failed',
        },
        { status: 401 }
      );
    }

    const companyId = authResult.company!.id;
    logData.companyId = companyId;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branchCode = searchParams.get('branchCode');
    const accountingCode = searchParams.get('accountingCode');

    logData.startDate = startDate || '';
    logData.endDate = endDate || '';

    // Validate required parameters
    if (!startDate || !endDate) {
      logData.statusCode = 400;
      logData.errorMessage = 'Missing required parameters: startDate, endDate';

      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: startDate, endDate'
        },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      logData.statusCode = 400;
      logData.errorMessage = 'Invalid date format';

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD'
        },
        { status: 400 }
      );
    }

    // Build filters JSON
    const filters: any = {};
    if (branchCode) filters.branchCode = branchCode;
    if (accountingCode) filters.accountingCode = accountingCode;
    logData.filters = Object.keys(filters).length > 0 ? JSON.stringify(filters) : null;

    // Build where clause
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

    // Fetch summary data
    const summaryData = await prisma.salesSummary.findMany({
      where,
      orderBy: [
        { sheetDate: 'asc' },
        { branchCode: 'asc' },
        { accountingCode: 'asc' },
      ],
    });

    // Calculate totals
    const totals = {
      totalQuantity: 0,
      totalSubTotal: 0,
      totalTaxTotal: 0,
      totalAmount: 0,
      recordCount: summaryData.length,
    };

    summaryData.forEach((record) => {
      totals.totalQuantity += record.quantity;
      totals.totalSubTotal += record.subTotal;
      totals.totalTaxTotal += record.taxTotal;
      totals.totalAmount += record.total;
    });

    logData.recordCount = summaryData.length;

    return NextResponse.json({
      success: true,
      company: {
        code: authResult.company?.code,
        name: authResult.company?.name,
      },
      data: {
        dateRange: {
          startDate,
          endDate,
        },
        filters: {
          branchCode: branchCode || null,
          accountingCode: accountingCode || null,
        },
        totals,
        records: summaryData.map((record) => ({
          sheetDate: record.sheetDate,
          branchCode: record.branchCode,
          branchID: record.branchID,
          accountingCode: record.accountingCode,
          mainAccountingCode: record.mainAccountingCode || null,
          isMainCombo: record.isMainCombo,
          isExternal: record.isExternal,
          taxPercent: record.taxPercent,
          quantity: record.quantity,
          subTotal: record.subTotal,
          taxTotal: record.taxTotal,
          total: record.total,
          version: record.version,
          lastModified: record.lastModified,
        })),
      },
    });
  } catch (error) {
    console.error('[ERP Sales Summary] Error:', error);
    logData.statusCode = 500;
    logData.errorMessage = error instanceof Error ? error.message : 'Failed to fetch sales summary';

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sales summary',
      },
      { status: 500 }
    );
  } finally {
    // Log request
    if (logData.companyId) {
      try {
        const responseTime = Date.now() - requestStartTime;
        await prisma.eRPApiLog.create({
          data: {
            companyId: logData.companyId,
            endpoint: logData.endpoint,
            method: logData.method,
            startDate: logData.startDate,
            endDate: logData.endDate,
            filters: logData.filters,
            statusCode: logData.statusCode,
            responseTime,
            recordCount: logData.recordCount,
            errorMessage: logData.errorMessage,
          },
        });
      } catch (logError) {
        console.error('[ERP Sales Summary] Logging error:', logError);
      }
    }
  }
}

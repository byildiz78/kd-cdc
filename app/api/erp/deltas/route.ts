import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyERPToken } from '@/lib/auth/erp-auth';

/**
 * @swagger
 * /api/erp/deltas:
 *   get:
 *     summary: Get delta changes for ERP
 *     description: ERP sisteminin sadece değişen kayıtları (delta) çekmesi için endpoint. Bearer token ile authentication gerektirir.
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
 *         name: deltaType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PRE_SNAPSHOT, POST_SNAPSHOT]
 *           default: POST_SNAPSHOT
 *         description: Delta tipi
 *       - in: query
 *         name: changeType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [INCREASED, DECREASED, NEW, DELETED]
 *         description: Değişiklik tipi filtresi
 *       - in: query
 *         name: branchCode
 *         required: false
 *         schema:
 *           type: string
 *         description: Şube kodu filtresi
 *       - in: query
 *         name: accountingCode
 *         required: false
 *         schema:
 *           type: string
 *         description: Muhasebe kodu filtresi
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     statistics:
 *                       type: object
 *                     deltas:
 *                       type: array
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       400:
 *         description: Bad Request - Missing or invalid parameters
 */
export async function GET(request: NextRequest) {
  const requestStartTime = Date.now();
  let logData: any = {
    endpoint: '/api/erp/deltas',
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
    const deltaType = searchParams.get('deltaType') || 'POST_SNAPSHOT';
    const changeType = searchParams.get('changeType');
    const branchCode = searchParams.get('branchCode');
    const accountingCode = searchParams.get('accountingCode');

    logData.startDate = startDate || '';
    logData.endDate = endDate || '';

    // Validate required parameters
    if (!startDate || !endDate) {
      logData.statusCode = 400;
      logData.errorMessage = 'Missing required parameters';

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

    // Validate deltaType
    if (deltaType !== 'PRE_SNAPSHOT' && deltaType !== 'POST_SNAPSHOT') {
      logData.statusCode = 400;
      logData.errorMessage = 'Invalid deltaType';

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid deltaType. Use PRE_SNAPSHOT or POST_SNAPSHOT'
        },
        { status: 400 }
      );
    }

    // Build filters JSON
    const filters: any = { deltaType };
    if (changeType) filters.changeType = changeType;
    if (branchCode) filters.branchCode = branchCode;
    if (accountingCode) filters.accountingCode = accountingCode;
    logData.filters = JSON.stringify(filters);

    // Build where clause
    const where: any = {
      sheetDate: {
        gte: startDate,
        lte: endDate,
      },
      deltaType,
    };

    if (changeType) {
      where.changeType = changeType;
    }

    if (branchCode) {
      where.branchCode = branchCode;
    }

    if (accountingCode) {
      where.accountingCode = accountingCode;
    }

    // Fetch delta records
    const deltas = await prisma.salesSummaryDelta.findMany({
      where,
      include: {
        affectedOrders: {
          select: {
            orderKey: true,
          },
        },
      },
      orderBy: [
        { sheetDate: 'asc' },
        { branchCode: 'asc' },
        { accountingCode: 'asc' },
      ],
    });

    // Calculate statistics
    const stats = {
      totalDeltas: deltas.length,
      byChangeType: {
        INCREASED: 0,
        DECREASED: 0,
        NEW: 0,
        DELETED: 0,
      },
      totalQuantityChange: 0,
      totalSubTotalChange: 0,
      totalTaxTotalChange: 0,
      totalAmountChange: 0,
    };

    deltas.forEach((delta) => {
      stats.byChangeType[delta.changeType as keyof typeof stats.byChangeType]++;

      // Calculate changes from old/new values
      const quantityChange = (delta.newQuantity || 0) - (delta.oldQuantity || 0);
      const subTotalChange = (delta.newSubTotal || 0) - (delta.oldSubTotal || 0);
      const taxTotalChange = (delta.newTaxTotal || 0) - (delta.oldTaxTotal || 0);
      const totalChange = (delta.newTotal || 0) - (delta.oldTotal || 0);

      stats.totalQuantityChange += quantityChange;
      stats.totalSubTotalChange += subTotalChange;
      stats.totalTaxTotalChange += taxTotalChange;
      stats.totalAmountChange += totalChange;
    });

    logData.recordCount = deltas.length;

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
        deltaType,
        filters: {
          changeType: changeType || null,
          branchCode: branchCode || null,
          accountingCode: accountingCode || null,
        },
        statistics: stats,
        deltas: deltas.map((delta) => {
          const quantityChange = (delta.newQuantity || 0) - (delta.oldQuantity || 0);
          const subTotalChange = (delta.newSubTotal || 0) - (delta.oldSubTotal || 0);
          const taxTotalChange = (delta.newTaxTotal || 0) - (delta.oldTaxTotal || 0);
          const totalChange = (delta.newTotal || 0) - (delta.oldTotal || 0);

          return {
            id: delta.id,
            sheetDate: delta.sheetDate,
            branchCode: delta.branchCode,
            branchID: delta.branchID,
            accountingCode: delta.accountingCode,
            mainAccountingCode: delta.mainAccountingCode || null,
            isMainCombo: delta.isMainCombo,
            isExternal: delta.isExternal,
            taxPercent: delta.taxPercent,
            changeType: delta.changeType,
            deltaType: delta.deltaType,
            changes: {
              quantity: quantityChange,
              subTotal: subTotalChange,
              taxTotal: taxTotalChange,
              total: totalChange,
            },
            oldValues: {
              quantity: delta.oldQuantity,
              subTotal: delta.oldSubTotal,
              taxTotal: delta.oldTaxTotal,
              total: delta.oldTotal,
            },
            newValues: {
              quantity: delta.newQuantity,
              subTotal: delta.newSubTotal,
              taxTotal: delta.newTaxTotal,
              total: delta.newTotal,
            },
            affectedOrderKeys: delta.affectedOrders.map((order) => order.orderKey),
            changedAt: delta.changedAt,
            syncBatchId: delta.syncBatchId,
          };
        }),
      },
    });
  } catch (error) {
    console.error('[ERP Deltas] Error:', error);
    logData.statusCode = 500;
    logData.errorMessage = error instanceof Error ? error.message : 'Failed to fetch deltas';

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch deltas',
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
        console.error('[ERP Deltas] Logging error:', logError);
      }
    }
  }
}

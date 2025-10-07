import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyERPToken } from '@/lib/auth/erp-auth';

/**
 * @swagger
 * /api/erp/confirm-pull:
 *   post:
 *     summary: Confirm ERP data pull
 *     description: ERP confirms successful data pull and triggers snapshot finalization
 *     tags:
 *       - ERP API
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - snapshotId
 *               - status
 *             properties:
 *               snapshotId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the snapshot being confirmed
 *                 example: "abc-123-def-456"
 *               status:
 *                 type: string
 *                 enum: [SUCCESS, FAILED]
 *                 description: Status of the pull operation
 *                 example: "SUCCESS"
 *               recordCount:
 *                 type: integer
 *                 description: Number of summary records pulled
 *                 example: 150
 *               deltaCount:
 *                 type: integer
 *                 description: Number of delta records pulled
 *                 example: 5
 *               errorMessage:
 *                 type: string
 *                 description: Error message if status is FAILED
 *                 example: "Database connection timeout"
 *     responses:
 *       200:
 *         description: Confirmation processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     snapshotId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     confirmedAt:
 *                       type: string
 *                       format: date-time
 *                     nextSnapshotId:
 *                       type: string
 *                       description: ID of newly created snapshot (only if SUCCESS)
 *       400:
 *         description: Bad request - Invalid parameters
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Snapshot not found
 *       409:
 *         description: Conflict - Snapshot already confirmed
 */
export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  let logData: any = {
    endpoint: '/api/erp/confirm-pull',
    method: 'POST',
    statusCode: 200,
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

    const body = await request.json();
    const { snapshotId, status, recordCount, deltaCount, errorMessage } = body;

    // Validate required fields
    if (!snapshotId || !status) {
      logData.statusCode = 400;
      logData.errorMessage = 'Missing required fields: snapshotId, status';

      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: snapshotId, status',
        },
        { status: 400 }
      );
    }

    // Validate status
    if (!['SUCCESS', 'FAILED'].includes(status)) {
      logData.statusCode = 400;
      logData.errorMessage = 'Invalid status. Must be SUCCESS or FAILED';

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status. Must be SUCCESS or FAILED',
        },
        { status: 400 }
      );
    }

    // Find snapshot
    const snapshot = await prisma.eRPSnapshot.findUnique({
      where: { id: snapshotId },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });

    if (!snapshot) {
      logData.statusCode = 404;
      logData.errorMessage = 'Snapshot not found';

      return NextResponse.json(
        {
          success: false,
          error: 'Snapshot not found',
        },
        { status: 404 }
      );
    }

    // Check if snapshot belongs to this company
    if (snapshot.companyId !== companyId) {
      logData.statusCode = 403;
      logData.errorMessage = 'Access denied - snapshot belongs to different company';

      return NextResponse.json(
        {
          success: false,
          error: 'Access denied',
        },
        { status: 403 }
      );
    }

    // Check if already confirmed
    if (snapshot.erpStatus === 'CONFIRMED') {
      logData.statusCode = 409;
      logData.errorMessage = 'Snapshot already confirmed';

      return NextResponse.json(
        {
          success: false,
          error: 'Snapshot already confirmed',
          data: {
            snapshotId: snapshot.id,
            confirmedAt: snapshot.erpConfirmedAt,
          },
        },
        { status: 409 }
      );
    }

    const now = new Date();

    if (status === 'SUCCESS') {
      // Get current total record count from SalesSummary
      // Extract date part only (YYYY-MM-DD) from datetime strings
      const startDate = snapshot.dataStartDate.split(' ')[0];
      const endDate = snapshot.dataEndDate.split(' ')[0];

      const currentRecordCount = await prisma.salesSummary.count({
        where: {
          sheetDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Count deltas for this snapshot
      const deltaCount = await prisma.salesSummaryDelta.count({
        where: {
          snapshotId: snapshotId,
          processed: false,
        },
      });

      // Mark snapshot as confirmed and update with actual counts
      await prisma.eRPSnapshot.update({
        where: { id: snapshotId },
        data: {
          erpStatus: 'CONFIRMED',
          erpConfirmedAt: now,
          recordCount: currentRecordCount,
          deltaCount: deltaCount,
          erpRecordCount: recordCount || null,
          erpDeltaCount: deltaCount || null,
        },
      });

      // Mark all deltas related to this snapshot as processed
      const processedDeltas = await prisma.salesSummaryDelta.updateMany({
        where: {
          snapshotId: snapshotId,
          processed: false,
        },
        data: {
          processed: true,
          processedAt: now,
        },
      });

      // Create new snapshot for next pull (baseline for next period)
      // Start with 0, will be updated when this snapshot is confirmed
      const newSnapshot = await prisma.eRPSnapshot.create({
        data: {
          companyId,
          snapshotDate: now,
          dataStartDate: snapshot.dataStartDate,
          dataEndDate: snapshot.dataEndDate,
          recordCount: 0,
          deltaCount: 0,
          erpStatus: 'PENDING',
        },
      });

      console.log(
        `[ERP Confirm] SUCCESS: Snapshot ${snapshotId} confirmed for company ${companyId}. New snapshot ${newSnapshot.id} created.`
      );

      logData.recordCount = recordCount || 0;

      return NextResponse.json({
        success: true,
        message: 'Pull confirmed successfully. New snapshot created for next period.',
        data: {
          snapshotId: snapshot.id,
          status: 'CONFIRMED',
          confirmedAt: now,
          nextSnapshotId: newSnapshot.id,
          processedDeltaCount: deltaCount || 0,
        },
      });
    } else {
      // Mark snapshot as failed
      await prisma.eRPSnapshot.update({
        where: { id: snapshotId },
        data: {
          erpStatus: 'FAILED',
          erpErrorMessage: errorMessage || 'Unknown error',
        },
      });

      console.error(
        `[ERP Confirm] FAILED: Snapshot ${snapshotId} failed for company ${companyId}. Error: ${errorMessage}`
      );

      logData.statusCode = 200; // Still 200 because request itself succeeded
      logData.errorMessage = errorMessage || 'ERP pull failed';

      return NextResponse.json({
        success: true,
        message: 'Pull failure recorded. Snapshot preserved for retry.',
        data: {
          snapshotId: snapshot.id,
          status: 'FAILED',
          errorMessage: errorMessage || 'Unknown error',
        },
      });
    }
  } catch (error) {
    console.error('[ERP Confirm Pull] Error:', error);
    logData.statusCode = 500;
    logData.errorMessage = error instanceof Error ? error.message : 'Failed to process confirmation';

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process confirmation',
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
            startDate: '',
            endDate: '',
            filters: null,
            statusCode: logData.statusCode,
            responseTime,
            recordCount: logData.recordCount || 0,
            errorMessage: logData.errorMessage,
          },
        });
      } catch (logError) {
        console.error('[ERP Confirm Pull] Logging error:', logError);
      }
    }
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyERPToken } from '@/lib/auth/erp-auth';

/**
 * @swagger
 * /api/erp/snapshot:
 *   post:
 *     summary: Create ERP snapshot manually
 *     description: Creates an ERP snapshot for a company to mark the baseline date. Uses Bearer token authentication.
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
 *               - dataStartDate
 *               - dataEndDate
 *             properties:
 *               dataStartDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-01"
 *               dataEndDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-05"
 *     responses:
 *       200:
 *         description: Snapshot created successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       400:
 *         description: Bad Request - Missing or invalid parameters
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate with ERP token
    const authResult = await verifyERPToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Authentication failed',
        },
        { status: 401 }
      );
    }

    const companyId = authResult.company!.id;

    const body = await request.json();
    const { dataStartDate, dataEndDate } = body;

    if (!dataStartDate || !dataEndDate) {
      return NextResponse.json(
        { error: 'Missing required fields: dataStartDate, dataEndDate' },
        { status: 400 }
      );
    }

    // Count summary records in this date range
    const summaryCount = await prisma.salesSummary.count({
      where: {
        sheetDate: {
          gte: dataStartDate,
          lte: dataEndDate,
        },
      },
    });

    // Create snapshot
    const snapshot = await prisma.eRPSnapshot.create({
      data: {
        companyId,
        snapshotDate: new Date(),
        dataStartDate,
        dataEndDate,
        recordCount: summaryCount,
        deltaCount: 0,
      },
    });

    console.log(
      `[API] Created initial ERP snapshot ${snapshot.id} for company ${companyId} with ${summaryCount} summary records`
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
          deltaCount: 0,
        },
      },
    });
  } catch (error) {
    console.error('[API] Create snapshot failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

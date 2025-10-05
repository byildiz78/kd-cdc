import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthenticated } from '@/lib/utils/auth';

/**
 * @swagger
 * /api/sales/summary:
 *   get:
 *     summary: Get sales summary data
 *     description: Retrieves aggregated sales data for a specified date range
 *     tags:
 *       - Sales
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response with sales summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   SheetDate:
 *                     type: string
 *                     format: date-time
 *                   MainAccountingCode:
 *                     type: string
 *                   AccountingCode:
 *                     type: string
 *                   IsMainCombo:
 *                     type: integer
 *                   Quantity:
 *                     type: number
 *                   SubTotal:
 *                     type: number
 *                   TaxTotal:
 *                     type: number
 *                   Total:
 *                     type: number
 *                   TaxPercent:
 *                     type: number
 *                   BranchID:
 *                     type: integer
 *                   BranchCode:
 *                     type: string
 *                   IsExternal:
 *                     type: boolean
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
 *       400:
 *         description: Bad request - Missing required parameters
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters', details: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const startDateLimit = new Date();
    startDateLimit.setDate(startDateLimit.getDate() - 30);
    const startDateLimitStr = startDateLimit.toISOString().split('T')[0];

    const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
    const formattedEndDate = new Date(endDate).toISOString().split('T')[0];

    let sqlQuery = `
      SELECT
        s.[SheetDate],
        s.[MainAccountingCode],
        s.[AccountingCode],
        s.[IsMainCombo],
        SUM(s.[Quantity]) AS [Quantity],
        SUM(s.[SubTotal]) AS [SubTotal],
        SUM(s.[TaxTotal]) AS [TaxTotal],
        SUM(s.[Total]) AS [Total],
        s.[TaxPercent],
        s.[BranchID],
        s.[BranchCode],
        s.[IsExternal]
      INTO #dbSales
      FROM posSheetSalesV2 s WITH(NOLOCK)
      WHERE 1=1
        AND s.[SheetDate] >= '${startDateLimitStr}'
        AND s.[SheetDate] BETWEEN CONVERT(VARCHAR, '${formattedStartDate}', 23) AND CONVERT(VARCHAR, '${formattedEndDate}', 23)
      GROUP BY
        s.[SheetDate],
        s.[MainAccountingCode],
        s.[AccountingCode],
        s.[IsMainCombo],
        s.[TaxPercent],
        s.[BranchID],
        s.[BranchCode],
        s.[IsExternal]
      HAVING
        ROUND(SUM(s.[Quantity]), 3) <> 0

      SELECT * FROM #dbSales
      ORDER BY [SheetDate], [BranchCode], [MainAccountingCode]

      DROP TABLE #dbSales
    `;

    const apiUrl = process.env.ROBOTPOS_API_URL;
    const apiToken = process.env.ROBOTPOS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      throw new Error('API configuration is missing');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sqlQuery }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    if (result.data && Array.isArray(result.data)) {
      return NextResponse.json(result.data);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch summary data',
        details: error.message
      },
      { status: 500 }
    );
  }
}

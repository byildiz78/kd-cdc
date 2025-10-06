import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { getQueryByCode, replaceQueryParams } from '@/lib/services/query.service';
import { executeRobotPosQuery, parseSalesResponse } from '@/lib/services/robotpos.service';

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Get detailed sales data
 *     description: Retrieves detailed sales transaction data for a specified date range
 *     tags:
 *       - Sales
 *     security:
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
 *         description: Successful response with sales data
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Bad request - Missing required parameters
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const auth = await authenticate(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please login first' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log('Sales API Request params:', { startDate, endDate });

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          details: 'Please provide both startDate and endDate parameters',
        },
        { status: 400 }
      );
    }

    // Get query from database
    const query = await getQueryByCode('sales-data');

    // Format dates (replace - with / for sales query)
    const formattedStartDate = startDate.replace(/-/g, '/');
    const formattedEndDate = endDate.replace(/-/g, '/');

    // Replace parameters
    const sqlQuery = replaceQueryParams(query.sqlContent, {
      StartDate: formattedStartDate,
      EndDate: formattedEndDate,
    });

    console.log('Formatted dates:', { formattedStartDate, formattedEndDate });

    // Execute query on RobotPos API
    const data = await executeRobotPosQuery(auth.apiUrl, auth.apiToken, sqlQuery);

    // Parse response
    const salesData = parseSalesResponse(data);
    console.log('Sales data count:', salesData.length);

    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=60');

    return NextResponse.json(salesData, { headers });
  } catch (error) {
    console.error('API Error Details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch sales data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

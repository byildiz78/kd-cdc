import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { getQueryByCode, replaceQueryParams } from '@/lib/services/query.service';
import { executeRobotPosQuery, parseInvoiceResponse } from '@/lib/services/robotpos.service';

/**
 * @swagger
 * /api/invoices/headers:
 *   get:
 *     summary: Fetch invoice headers only (optimized)
 *     description: Retrieves invoice headers without items and payments for better performance
 *     tags:
 *       - Invoices
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad Request - Missing required parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Headers API Route called');

    // Authenticate
    const auth = await authenticate(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please login first' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log('Request params:', { startDate, endDate });

    // Validate required parameters
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
    const query = await getQueryByCode('invoice-headers');

    // Replace parameters
    const sqlQuery = replaceQueryParams(query.sqlContent, {
      StartDate: startDate,
      EndDate: endDate,
    });

    console.log('Sending request to:', auth.apiUrl);
    console.log('Query type: Headers only');

    // Execute query on RobotPos API
    const data = await executeRobotPosQuery(auth.apiUrl, auth.apiToken, sqlQuery);

    // Parse response
    const invoices = parseInvoiceResponse(data);
    console.log('Parsed invoice headers count:', invoices.length);

    // Add cache headers
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=60'); // Cache for 1 minute

    return NextResponse.json(invoices, { headers });
  } catch (error) {
    console.error('API Error Details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch invoice headers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

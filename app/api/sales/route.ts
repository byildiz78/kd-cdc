import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthenticated } from '@/lib/utils/auth';

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Get detailed sales data
 *     description: Retrieves detailed sales transaction data for a specified date range
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
    if (!isAuthenticated(request)) {
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
          details: 'Please provide both startDate and endDate parameters'
        },
        { status: 400 }
      );
    }

    const sqlFilePath = path.join(process.cwd(), 'sqlquery-sales.txt');
    let sqlQuery = fs.readFileSync(sqlFilePath, 'utf-8');

    const formattedStartDate = startDate.replace(/-/g, '/');
    const formattedEndDate = endDate.replace(/-/g, '/');

    sqlQuery = sqlQuery.replace(/@StartDate/g, `'${formattedStartDate}'`);
    sqlQuery = sqlQuery.replace(/@EndDate/g, `'${formattedEndDate}'`);

    console.log('Formatted dates:', { formattedStartDate, formattedEndDate });

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
      body: JSON.stringify({
        query: sqlQuery
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Raw API response length:', responseText.length);

    let apiResponse;

    try {
      apiResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse API response as JSON:', parseError);
      throw new Error('Invalid JSON response from API');
    }

    console.log('API Response:', {
      hasData: !!apiResponse?.data,
      dataLength: apiResponse?.data?.length,
      totalRows: apiResponse?.totalRows,
      error: apiResponse?.error
    });

    const salesData = apiResponse?.data || [];
    console.log('Sales data count:', salesData.length);

    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=60');

    return NextResponse.json(salesData, { headers });

  } catch (error) {
    console.error('API Error Details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch sales data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

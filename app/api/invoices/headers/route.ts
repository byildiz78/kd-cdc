import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
 *         example: "2023-07-01"
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *         example: "2023-07-31"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   OrderKey:
 *                     type: string
 *                     format: uuid
 *                   OrderID:
 *                     type: integer
 *                   BranchName:
 *                     type: string
 *                   Type:
 *                     type: string
 *                     enum: [E-FATURA, E-ARŞİV]
 *                   InvoiceTotal:
 *                     type: number
 *                   CustomerName:
 *                     type: string
 *                   CustomerTaxNo:
 *                     type: string
 *                   InvoiceDate:
 *                     type: string
 *                     format: date-time
 *                   ItemCount:
 *                     type: integer
 *                   PaymentCount:
 *                     type: integer
 *       400:
 *         description: Bad Request - Missing required parameters
 *       401:
 *         description: Unauthorized - Please login first
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Headers API Route called');
    
    // Check session authentication
    const cookieHeader = request.headers.get('cookie');
    const sessionCookie = cookieHeader?.split(';')
      .find(c => c.trim().startsWith('session='))
      ?.split('=')[1];
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please login first' },
        { status: 401 }
      );
    }
    
    // Decode and verify session
    try {
      const decoded = decodeURIComponent(sessionCookie);
      const sessionData = Buffer.from(decoded, 'base64').toString();
      const [username, timestamp] = sessionData.split(':');
      
      // Check if session is valid (less than 24 hours old)
      if (Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) {
        return NextResponse.json(
          { error: 'Session expired', details: 'Please login again' },
          { status: 401 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid session', details: 'Please login again' },
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
          details: 'Please provide both startDate and endDate parameters' 
        },
        { status: 400 }
      );
    }

    // Read SQL query from file
    const sqlFilePath = path.join(process.cwd(), 'sqlquery-headers.txt');
    let sqlQuery = fs.readFileSync(sqlFilePath, 'utf-8');

    // Replace parameters in SQL query
    sqlQuery = sqlQuery.replace(/@StartDate/g, `'${startDate}'`);
    sqlQuery = sqlQuery.replace(/@EndDate/g, `'${endDate}'`);

    // Get API configuration from environment
    const apiUrl = process.env.ROBOTPOS_API_URL;
    const apiToken = process.env.ROBOTPOS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      console.error('Missing API configuration:', { apiUrl: !!apiUrl, apiToken: !!apiToken });
      throw new Error('API configuration is missing');
    }

    console.log('Sending request to:', apiUrl);
    console.log('Query type: Headers only');

    // Make request to RobotPos API
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
      console.error('API request failed:', response.status, response.statusText, errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Raw API response length:', responseText.length);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse API response as JSON:', parseError);
      throw new Error('Invalid JSON response from API');
    }
    
    console.log('API Response received, has Result:', !!data?.Result);

    // Parse the Result field which contains the actual data
    let invoices = [];
    
    // Handle the response structure from RobotPos API
    if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
      const resultData = data.data[0];
      console.log('Result data structure:', Object.keys(resultData));
      
      if (resultData.Result) {
        try {
          invoices = JSON.parse(resultData.Result);
          console.log('Parsed invoice headers count:', invoices.length);
          
          // No need to parse Items and Payments as they're not included in headers query
          invoices = invoices.map((invoice: any) => ({
            ...invoice,
            RefNo: invoice.RefNo || '' // Add RefNo field if missing
          }));
        } catch (parseError) {
          console.error('Error parsing Result field:', parseError);
          invoices = [];
        }
      }
    } else {
      console.log('Unexpected API response structure:', data);
    }

    // Add cache headers for better performance
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=60'); // Cache for 1 minute
    
    return NextResponse.json(invoices, { headers });

  } catch (error) {
    console.error('API Error Details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoice headers', 
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    );
  }
}
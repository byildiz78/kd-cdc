import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * @swagger
 * /api/invoices:
 *   post:
 *     summary: Fetch invoices from RobotPos API
 *     description: Retrieves invoices based on date range or specific key
 *     tags:
 *       - Invoices
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startDate
 *               - endDate
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Start date for filtering (YYYY-MM-DD)
 *                 example: "2023-07-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: End date for filtering (YYYY-MM-DD)
 *                 example: "2023-07-31"
 *               key:
 *                 type: string
 *                 format: uuid
 *                 description: Optional - Specific order key to fetch (if provided, date range is ignored)
 *                 example: "366C47D9-4A1E-4A20-B2C4-5C992C666E57"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: Bad Request - Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing API token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: NextRequest) {
  try {
    console.log('API Route called');
    
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
    
    // Get request body
    const body = await request.json();
    const { startDate, endDate, key } = body;
    console.log('Request params:', { startDate, endDate, key });
    
    // Validate required parameters if key is not provided
    if (!key && (!startDate || !endDate)) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters', 
          details: 'Please provide either a key or both startDate and endDate parameters' 
        },
        { status: 400 }
      );
    }

    // Read SQL query from file
    const sqlFilePath = path.join(process.cwd(), 'sqlquery.txt');
    let sqlQuery = fs.readFileSync(sqlFilePath, 'utf-8');

    // Replace parameters in SQL query
    if (startDate && endDate) {
      sqlQuery = sqlQuery.replace(/@StartDate/g, `'${startDate}'`);
      sqlQuery = sqlQuery.replace(/@EndDate/g, `'${endDate}'`);
    } else {
      // Default to today's date
      const today = new Date().toISOString().split('T')[0];
      
      sqlQuery = sqlQuery.replace(/@StartDate/g, `'${today}'`);
      sqlQuery = sqlQuery.replace(/@EndDate/g, `'${today}'`);
      
      console.log('Using default date (today):', { start: today, end: today });
    }

    // Get API configuration from environment
    const apiUrl = process.env.ROBOTPOS_API_URL;
    const apiToken = process.env.ROBOTPOS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      console.error('Missing API configuration:', { apiUrl: !!apiUrl, apiToken: !!apiToken });
      throw new Error('API configuration is missing');
    }

    console.log('Sending request to:', apiUrl);
    console.log('Query length:', sqlQuery.length);

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
    console.log('Raw API response:', responseText.substring(0, 500));
    
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
          console.log('Parsed invoices count:', invoices.length);
          
          // Parse nested JSON strings for Items and Payments
          invoices = invoices.map((invoice: any) => ({
            ...invoice,
            Items: typeof invoice.Items === 'string' ? JSON.parse(invoice.Items) : invoice.Items,
            Payments: typeof invoice.Payments === 'string' ? JSON.parse(invoice.Payments) : invoice.Payments,
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

    return NextResponse.json(invoices);

  } catch (error) {
    console.error('API Error Details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoices', 
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    );
  }
}
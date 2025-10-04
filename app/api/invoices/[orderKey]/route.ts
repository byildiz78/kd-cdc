import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * @swagger
 * /api/invoices/{orderKey}:
 *   get:
 *     summary: Fetch specific invoice detail
 *     description: Retrieves complete invoice information including items and payments
 *     tags:
 *       - Invoices
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderKey
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique order identifier
 *         example: "366C47D9-4A1E-4A20-B2C4-5C992C666E57"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 OrderKey:
 *                   type: string
 *                   format: uuid
 *                 OrderID:
 *                   type: integer
 *                 BranchName:
 *                   type: string
 *                 Type:
 *                   type: string
 *                   enum: [E-FATURA, E-ARŞİV]
 *                 InvoiceTotal:
 *                   type: number
 *                 CustomerName:
 *                   type: string
 *                 CustomerTaxNo:
 *                   type: string
 *                 InvoiceDate:
 *                   type: string
 *                   format: date-time
 *                 Items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InvoiceItem'
 *                 Payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InvoicePayment'
 *       400:
 *         description: Bad Request - Invalid orderKey format
 *       401:
 *         description: Unauthorized - Please login first
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderKey: string } }
) {
  try {
    console.log('Invoice Detail API Route called');
    
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
    
    // Get orderKey from URL params
    const orderKey = params.orderKey;
    
    console.log('Request params:', { orderKey });
    
    // Validate orderKey format (basic UUID validation)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!orderKey || !uuidRegex.test(orderKey)) {
      return NextResponse.json(
        { 
          error: 'Invalid orderKey format', 
          details: 'Please provide a valid UUID format for orderKey' 
        },
        { status: 400 }
      );
    }

    // Read SQL query from file
    const sqlFilePath = path.join(process.cwd(), 'sqlquery-detail.txt');
    let sqlQuery = fs.readFileSync(sqlFilePath, 'utf-8');

    // Replace parameter in SQL query
    sqlQuery = sqlQuery.replace(/@OrderKey/g, `'${orderKey}'`);

    // Get API configuration from environment
    const apiUrl = process.env.ROBOTPOS_API_URL;
    const apiToken = process.env.ROBOTPOS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      console.error('Missing API configuration:', { apiUrl: !!apiUrl, apiToken: !!apiToken });
      throw new Error('API configuration is missing');
    }

    console.log('Sending request to:', apiUrl);
    console.log('Query type: Full detail for OrderKey:', orderKey);
    console.log('Full SQL Query:', sqlQuery);

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
    let invoice = null;
    
    // Handle the response structure from RobotPos API
    if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
      const resultData = data.data[0];
      console.log('Result data structure:', Object.keys(resultData));
      
      if (resultData.Result) {
        try {
          const invoices = JSON.parse(resultData.Result);
          console.log('Parsed invoices count:', invoices.length);
          
          if (invoices.length > 0) {
            invoice = invoices[0]; // Get first (and should be only) result
            
            // Parse nested JSON strings for Items and Payments
            if (typeof invoice.Items === 'string') {
              invoice.Items = JSON.parse(invoice.Items);
            }
            if (typeof invoice.Payments === 'string') {
              invoice.Payments = JSON.parse(invoice.Payments);
            }
            
            // Ensure arrays
            invoice.Items = invoice.Items || [];
            invoice.Payments = invoice.Payments || [];
            invoice.RefNo = invoice.RefNo || '';
          }
        } catch (parseError) {
          console.error('Error parsing Result field:', parseError);
        }
      }
    } else {
      console.log('Unexpected API response structure:', data);
    }

    // Check if invoice was found
    if (!invoice) {
      return NextResponse.json(
        { 
          error: 'Invoice not found', 
          details: `No invoice found with OrderKey: ${orderKey}` 
        },
        { status: 404 }
      );
    }

    // Add cache headers for better performance
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=300'); // Cache for 5 minutes
    
    return NextResponse.json(invoice, { headers });

  } catch (error) {
    console.error('API Error Details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoice detail', 
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    );
  }
}
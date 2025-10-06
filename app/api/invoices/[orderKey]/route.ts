import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { getQueryByCode, replaceQueryParams } from '@/lib/services/query.service';
import { executeRobotPosQuery, parseInvoiceResponse } from '@/lib/services/robotpos.service';

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
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad Request - Invalid orderKey format
 *       401:
 *         description: Unauthorized
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

    // Authenticate
    const auth = await authenticate(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please login first' },
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
          details: 'Please provide a valid UUID format for orderKey',
        },
        { status: 400 }
      );
    }

    // Get query from database
    const query = await getQueryByCode('invoice-detail');

    // Replace parameter
    const sqlQuery = replaceQueryParams(query.sqlContent, {
      OrderKey: orderKey,
    });

    console.log('Sending request to:', auth.apiUrl);
    console.log('Query type: Full detail for OrderKey:', orderKey);

    // Execute query on RobotPos API
    const data = await executeRobotPosQuery(auth.apiUrl, auth.apiToken, sqlQuery);

    // Parse response
    const invoices = parseInvoiceResponse(data);

    // Get first (and should be only) result
    const invoice = invoices.length > 0 ? invoices[0] : null;

    // Check if invoice was found
    if (!invoice) {
      return NextResponse.json(
        {
          error: 'Invoice not found',
          details: `No invoice found with OrderKey: ${orderKey}`,
        },
        { status: 404 }
      );
    }

    // Add cache headers
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=300'); // Cache for 5 minutes

    return NextResponse.json(invoice, { headers });
  } catch (error) {
    console.error('API Error Details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch invoice detail',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

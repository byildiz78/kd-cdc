import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/auth/middleware';

/**
 * @swagger
 * /api/queries:
 *   get:
 *     summary: Get all queries
 *     description: List all SQL queries (SuperAdmin only)
 *     tags:
 *       - Queries
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successful response
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - SuperAdmin only
 */
export async function GET(request: NextRequest) {
  try {
    // Only SuperAdmin can view queries
    const isSuperAdmin = await hasRole(request, ['SUPERADMIN']);
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', details: 'SuperAdmin access required' },
        { status: 403 }
      );
    }

    const queries = await prisma.query.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(queries);
  } catch (error) {
    console.error('Error fetching queries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queries', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/queries:
 *   post:
 *     summary: Create a new query
 *     description: Create a new SQL query (SuperAdmin only)
 *     tags:
 *       - Queries
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - sqlContent
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               sqlContent:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [INVOICE, SALES, CUSTOM]
 *     responses:
 *       201:
 *         description: Query created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - SuperAdmin only
 */
export async function POST(request: NextRequest) {
  try {
    // Only SuperAdmin can create queries
    const isSuperAdmin = await hasRole(request, ['SUPERADMIN']);
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', details: 'SuperAdmin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, sqlContent, description, category } = body;

    if (!name || !code || !sqlContent) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'name, code, and sqlContent are required' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.query.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Query code already exists', details: `A query with code '${code}' already exists` },
        { status: 400 }
      );
    }

    const query = await prisma.query.create({
      data: {
        name,
        code,
        sqlContent,
        description: description || null,
        category: category || 'CUSTOM',
        isActive: true,
      },
    });

    return NextResponse.json(query, { status: 201 });
  } catch (error) {
    console.error('Error creating query:', error);
    return NextResponse.json(
      { error: 'Failed to create query', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

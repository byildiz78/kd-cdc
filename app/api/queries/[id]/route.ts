import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/auth/middleware';

/**
 * @swagger
 * /api/queries/{id}:
 *   get:
 *     summary: Get query by ID
 *     description: Get a specific SQL query (SuperAdmin only)
 *     tags:
 *       - Queries
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Query not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isSuperAdmin = await hasRole(request, ['SUPERADMIN']);
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', details: 'SuperAdmin access required' },
        { status: 403 }
      );
    }

    const query = await prisma.query.findUnique({
      where: { id: params.id },
    });

    if (!query) {
      return NextResponse.json(
        { error: 'Query not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(query);
  } catch (error) {
    console.error('Error fetching query:', error);
    return NextResponse.json(
      { error: 'Failed to fetch query', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/queries/{id}:
 *   put:
 *     summary: Update query
 *     description: Update a SQL query (SuperAdmin only)
 *     tags:
 *       - Queries
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               sqlContent:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Query updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Query not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isSuperAdmin = await hasRole(request, ['SUPERADMIN']);
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', details: 'SuperAdmin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, sqlContent, description, category, isActive } = body;

    const existing = await prisma.query.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Query not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.query.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(sqlContent !== undefined && { sqlContent }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating query:', error);
    return NextResponse.json(
      { error: 'Failed to update query', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/queries/{id}:
 *   delete:
 *     summary: Delete query
 *     description: Delete a SQL query (SuperAdmin only)
 *     tags:
 *       - Queries
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Query deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Query not found
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isSuperAdmin = await hasRole(request, ['SUPERADMIN']);
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', details: 'SuperAdmin access required' },
        { status: 403 }
      );
    }

    const existing = await prisma.query.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Query not found' },
        { status: 404 }
      );
    }

    await prisma.query.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Query deleted successfully' });
  } catch (error) {
    console.error('Error deleting query:', error);
    return NextResponse.json(
      { error: 'Failed to delete query', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

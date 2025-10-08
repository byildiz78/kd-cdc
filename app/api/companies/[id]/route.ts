import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/auth/middleware';
import { encrypt } from '@/lib/crypto';

/**
 * @swagger
 * /api/companies/{id}:
 *   get:
 *     summary: Get company by ID
 *     description: Get a specific company (SuperAdmin only)
 *     tags:
 *       - Companies
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
 *         description: Company not found
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

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...company,
      apiToken: '***', // Masked for security
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/companies/{id}:
 *   put:
 *     summary: Update company
 *     description: Update a company (SuperAdmin only)
 *     tags:
 *       - Companies
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
 *               apiUrl:
 *                 type: string
 *               apiToken:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Company updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Company not found
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
    const {
      name,
      apiUrl,
      apiToken,
      erpApiToken,
      isActive,
      syncType,
      syncEnabled,
      syncIntervalMinutes,
      dailySyncHour,
      dailySyncMinute,
      weeklySyncDay,
      weeklySyncHour,
      weeklySyncMinute
    } = body;

    const existing = await prisma.company.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (apiUrl !== undefined) updateData.apiUrl = apiUrl;
    if (apiToken !== undefined && apiToken !== '***') {
      updateData.apiToken = encrypt(apiToken);
    }
    if (erpApiToken !== undefined) updateData.erpApiToken = erpApiToken;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Sync schedule settings
    if (syncType !== undefined) updateData.syncType = syncType;
    if (syncEnabled !== undefined) updateData.syncEnabled = syncEnabled;
    if (syncIntervalMinutes !== undefined) updateData.syncIntervalMinutes = syncIntervalMinutes;
    if (dailySyncHour !== undefined) updateData.dailySyncHour = dailySyncHour;
    if (dailySyncMinute !== undefined) updateData.dailySyncMinute = dailySyncMinute;
    if (weeklySyncDay !== undefined) updateData.weeklySyncDay = weeklySyncDay;
    if (weeklySyncHour !== undefined) updateData.weeklySyncHour = weeklySyncHour;
    if (weeklySyncMinute !== undefined) updateData.weeklySyncMinute = weeklySyncMinute;

    const updated = await prisma.company.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      ...updated,
      apiToken: '***', // Don't return the encrypted token
    });
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Failed to update company', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/companies/{id}:
 *   delete:
 *     summary: Delete company
 *     description: Delete a company (SuperAdmin only)
 *     tags:
 *       - Companies
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
 *         description: Company deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Company not found
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

    const existing = await prisma.company.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    await prisma.company.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Failed to delete company', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

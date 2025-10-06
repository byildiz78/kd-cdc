import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/auth/middleware';
import { encrypt } from '@/lib/crypto';

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Get all companies
 *     description: List all companies (SuperAdmin only)
 *     tags:
 *       - Companies
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
    const session = await prisma.session.findFirst({
      where: {
        token: request.cookies.get('session')?.value,
        expiresAt: { gte: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isSuperAdmin = session.user.role === 'SUPERADMIN';

    let companies;
    if (isSuperAdmin) {
      companies = await prisma.company.findMany({
        include: {
          _count: {
            select: { users: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      if (!session.user.companyId) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }

      const company = await prisma.company.findUnique({
        where: { id: session.user.companyId },
        include: {
          _count: {
            select: { users: true },
          },
        },
      });

      companies = company ? [company] : [];
    }

    const companiesWithoutTokens = companies.map((company) => ({
      ...company,
      apiToken: '***',
    }));

    return NextResponse.json({
      success: true,
      data: companiesWithoutTokens,
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/companies:
 *   post:
 *     summary: Create a new company
 *     description: Create a new company (SuperAdmin only)
 *     tags:
 *       - Companies
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
 *               - apiUrl
 *               - apiToken
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               apiUrl:
 *                 type: string
 *               apiToken:
 *                 type: string
 *     responses:
 *       201:
 *         description: Company created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - SuperAdmin only
 */
export async function POST(request: NextRequest) {
  try {
    const isSuperAdmin = await hasRole(request, ['SUPERADMIN']);
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', details: 'SuperAdmin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, apiUrl, apiToken } = body;

    if (!name || !code || !apiUrl || !apiToken) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'name, code, apiUrl, and apiToken are required' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.company.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Company code already exists', details: `A company with code '${code}' already exists` },
        { status: 400 }
      );
    }

    // Encrypt API token
    const encryptedToken = encrypt(apiToken);

    const company = await prisma.company.create({
      data: {
        name,
        code,
        apiUrl,
        apiToken: encryptedToken,
        isActive: true,
      },
    });

    return NextResponse.json({
      ...company,
      apiToken: '***', // Don't return the encrypted token
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'Failed to create company', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

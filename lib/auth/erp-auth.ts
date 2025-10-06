import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface ERPAuthResult {
  success: boolean;
  company?: {
    id: string;
    name: string;
    code: string;
  };
  error?: string;
}

/**
 * ERP API Token authentication
 * Header: Authorization: Bearer <erpApiToken>
 */
export async function verifyERPToken(request: NextRequest): Promise<ERPAuthResult> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return {
        success: false,
        error: 'Missing Authorization header',
      };
    }

    // Extract Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return {
        success: false,
        error: 'Invalid Authorization header format. Use: Bearer <token>',
      };
    }

    const token = parts[1];

    if (!token) {
      return {
        success: false,
        error: 'Missing token',
      };
    }

    // Find company by erpApiToken
    const company = await prisma.company.findFirst({
      where: {
        erpApiToken: token,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    if (!company) {
      return {
        success: false,
        error: 'Invalid or inactive token',
      };
    }

    return {
      success: true,
      company,
    };
  } catch (error) {
    console.error('[ERP Auth] Error:', error);
    return {
      success: false,
      error: 'Authentication failed',
    };
  }
}

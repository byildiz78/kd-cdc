import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify session
 *     description: Check if user session is valid
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Session is valid
 *       401:
 *         description: Session is invalid or expired
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        username: session.user.username,
        role: session.user.role,
        companyId: session.user.companyId,
        companyName: session.company?.name || null,
      },
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}

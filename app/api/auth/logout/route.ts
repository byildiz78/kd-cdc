import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const sessionToken = cookieHeader
      ?.split(';')
      .find((c) => c.trim().startsWith('session='))
      ?.split('=')[1];

    if (sessionToken) {
      const decoded = decodeURIComponent(sessionToken);
      await deleteSession(decoded);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

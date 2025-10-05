import { NextRequest } from 'next/server';

export function validateBearerToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  const validToken = process.env.ROBOTPOS_API_TOKEN;

  if (!validToken) {
    console.error('ROBOTPOS_API_TOKEN not configured');
    return false;
  }

  return token === validToken;
}

export function validateSessionCookie(request: NextRequest): boolean {
  const cookieHeader = request.headers.get('cookie');
  const sessionCookie = cookieHeader?.split(';')
    .find(c => c.trim().startsWith('session='))
    ?.split('=')[1];

  return !!sessionCookie;
}

export function isAuthenticated(request: NextRequest): boolean {
  return validateBearerToken(request) || validateSessionCookie(request);
}

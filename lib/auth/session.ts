import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { User, Company } from '@prisma/client';
import crypto from 'crypto';

export interface SessionData {
  user: User;
  company: Company | null;
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get session from request cookies
 */
export async function getSession(request: NextRequest): Promise<SessionData | null> {
  const cookieHeader = request.headers.get('cookie');

  const sessionToken = cookieHeader
    ?.split(';')
    .find((c) => c.trim().startsWith('session='))
    ?.split('=')[1];

  if (!sessionToken) return null;

  const decoded = decodeURIComponent(sessionToken);

  const session = await prisma.session.findUnique({
    where: { token: decoded },
    include: {
      user: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return {
    user: session.user,
    company: session.user.company,
  };
}

/**
 * Create a new session for user
 */
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

/**
 * Delete session
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  });
}

/**
 * Clean up expired sessions (cron job)
 */
export async function cleanupExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}

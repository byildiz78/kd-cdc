import { NextRequest } from 'next/server';
import { getSession, SessionData } from './session';
import { decrypt } from '@/lib/crypto';

export interface AuthContext {
  user: SessionData['user'];
  company: SessionData['company'];
  apiUrl: string;
  apiToken: string;
  isSuperAdmin: boolean;
}

/**
 * Authenticate request and return auth context
 */
export async function authenticate(request: NextRequest): Promise<AuthContext | null> {
  const session = await getSession(request);

  if (!session) return null;

  // SuperAdmin uses env credentials
  if (session.user.role === 'SUPERADMIN') {
    return {
      user: session.user,
      company: null,
      apiUrl: process.env.ROBOTPOS_API_URL || '',
      apiToken: process.env.ROBOTPOS_API_TOKEN || '',
      isSuperAdmin: true,
    };
  }

  // Company users use their company's credentials
  if (!session.company) return null;

  return {
    user: session.user,
    company: session.company,
    apiUrl: session.company.apiUrl,
    apiToken: decrypt(session.company.apiToken),
    isSuperAdmin: false,
  };
}

/**
 * Check if user is authenticated (simple check)
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const session = await getSession(request);
  return session !== null;
}

/**
 * Check if user has specific role
 */
export async function hasRole(
  request: NextRequest,
  roles: Array<'SUPERADMIN' | 'ADMIN' | 'USER'>
): Promise<boolean> {
  const session = await getSession(request);
  if (!session) return false;
  return roles.includes(session.user.role);
}

/**
 * Check if user can access company data
 */
export async function canAccessCompany(
  request: NextRequest,
  companyId: string
): Promise<boolean> {
  const session = await getSession(request);
  if (!session) return false;

  // SuperAdmin can access all companies
  if (session.user.role === 'SUPERADMIN') return true;

  // Users can only access their own company
  return session.user.companyId === companyId;
}

/**
 * Verify session and return userId
 */
export async function verifySession(request: NextRequest): Promise<{ userId: string } | null> {
  const session = await getSession(request);
  if (!session) return null;
  return { userId: session.user.id };
}

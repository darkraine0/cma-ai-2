import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/app/lib/auth';

/**
 * Middleware to check if user is authenticated
 * Returns null if authenticated, or NextResponse with error if not
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const user = getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  return null;
}

/**
 * Middleware to check if user has a specific role
 * Returns null if authorized, or NextResponse with error if not
 */
export function requireRole(request: NextRequest, allowedRoles: string[]): NextResponse | null {
  const user = getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden - Insufficient permissions' },
      { status: 403 }
    );
  }

  return null;
}

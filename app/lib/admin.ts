import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import { getCurrentUserFromRequest } from './auth';
import User, { UserRole, UserStatus } from '@/app/models/User';

/**
 * Admin utilities for role and permission checks
 * All admin operations must validate server-side
 * Always queries database to ensure current user state
 */

/**
 * Check if user is admin - server-side validation with database check
 * Returns null if admin, or error response if not
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const tokenPayload = getCurrentUserFromRequest(request);

  if (!tokenPayload) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  // Always verify from database - never trust token alone
  await connectDB();
  const user = await User.findById(tokenPayload.userId);

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  if (user.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Check if user is approved (can access protected routes)
 * Returns user if approved, or error response if not
 * Always queries database to verify current status
 */
export async function requireApproved(request: NextRequest): Promise<{ user: any } | NextResponse> {
  const tokenPayload = getCurrentUserFromRequest(request);

  if (!tokenPayload) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  // Always verify from database
  await connectDB();
  const user = await User.findById(tokenPayload.userId);

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // Admins are always approved, others must be approved
  if (user.role !== UserRole.ADMIN && user.status !== UserStatus.APPROVED) {
    return NextResponse.json(
      { error: 'Forbidden - Account must be approved by admin' },
      { status: 403 }
    );
  }

  return { user };
}

/**
 * Check if user has required permission
 * Returns user if has permission, or error response if not
 * Always queries database to verify current permission
 */
export async function requirePermission(
  request: NextRequest,
  requiredPermission: 'viewer' | 'editor'
): Promise<{ user: any } | NextResponse> {
  const approvedCheck = await requireApproved(request);
  
  if (approvedCheck instanceof NextResponse) {
    return approvedCheck;
  }

  const user = approvedCheck.user;

  // Admins have all permissions
  if (user.role === UserRole.ADMIN) {
    return { user };
  }

  // Check permission
  if (requiredPermission === 'editor' && user.permission !== 'editor') {
    return NextResponse.json(
      { error: 'Forbidden - Editor permission required' },
      { status: 403 }
    );
  }

  return { user };
}

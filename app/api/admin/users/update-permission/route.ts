import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User, { UserPermission } from '@/app/models/User';
import { requireAdmin } from '@/app/lib/admin';

/**
 * Admin API: Update user permission
 * POST /api/admin/users/update-permission
 * Body: { userId: string, permission: 'viewer' | 'editor' }
 * Requires: Admin role
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access (async now)
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    await connectDB();
    const body = await request.json();
    const { userId, permission } = body;

    if (!userId || !permission) {
      return NextResponse.json(
        { error: 'User ID and permission are required' },
        { status: 400 }
      );
    }

    if (!Object.values(UserPermission).includes(permission)) {
      return NextResponse.json(
        { error: 'Invalid permission. Must be "viewer" or "editor"' },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user permission
    user.permission = permission;
    await user.save();

    return NextResponse.json({
      message: 'User permission updated successfully',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        permission: user.permission,
        status: user.status,
      },
    });
  } catch (error: any) {
    console.error('Admin update permission error:', error);
    return NextResponse.json(
      { error: 'Failed to update user permission', message: error.message },
      { status: 500 }
    );
  }
}

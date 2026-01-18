import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User, { UserStatus } from '@/app/models/User';
import { requireAdmin } from '@/app/lib/admin';

/**
 * Admin API: Approve pending user
 * POST /api/admin/users/approve
 * Body: { userId: string, status: 'approved' | 'rejected' }
 * Requires: Admin role
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access (async now)
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    await connectDB();
    const body = await request.json();
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json(
        { error: 'User ID and status are required' },
        { status: 400 }
      );
    }

    if (![UserStatus.APPROVED, UserStatus.REJECTED].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "approved" or "rejected"' },
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

    // Update user status
    user.status = status;
    await user.save();

    return NextResponse.json({
      message: `User ${status} successfully`,
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
    console.error('Admin approve user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user status', message: error.message },
      { status: 500 }
    );
  }
}

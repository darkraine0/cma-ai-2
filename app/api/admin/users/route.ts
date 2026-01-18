import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { requireAdmin } from '@/app/lib/admin';

/**
 * Admin API: List all users
 * GET /api/admin/users
 * Requires: Admin role
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access (async now)
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    await connectDB();
    
    // Fetch all users, exclude password
    const users = await User.find({})
      .select('-password -resetPasswordToken -emailVerificationToken')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      users: users.map(user => ({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        permission: user.permission,
        status: user.status,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', message: error.message },
      { status: 500 }
    );
  }
}

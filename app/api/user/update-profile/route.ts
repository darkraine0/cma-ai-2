import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { getCurrentUserFromRequest } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const tokenPayload = getCurrentUserFromRequest(request);
    
    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();
    const { name } = body;

    const user = await User.findById(tokenPayload.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user name
    if (name !== undefined && name !== null) {
      user.name = name.trim();
    }

    await user.save();

    return NextResponse.json({
      message: 'Profile updated successfully',
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', message: error.message },
      { status: 500 }
    );
  }
}

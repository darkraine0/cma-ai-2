import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { generateToken, getCurrentUserFromRequest } from '@/app/lib/auth';
import { UserStatus } from '@/app/models/User';

/**
 * Email verification endpoint
 * Verifies email code and sets user status to pending
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Validate code format (4 digits)
    if (!/^\d{4}$/.test(code)) {
      return NextResponse.json(
        { error: 'Verification code must be 4 digits' },
        { status: 400 }
      );
    }

    // Find user with matching code that hasn't expired
    const user = await User.findOne({
      emailVerificationToken: code,
      emailVerificationExpires: { $gt: new Date() },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }
    
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }

    // Verify email and set status to pending
    user.emailVerified = true;
    user.status = UserStatus.PENDING; // User must be approved by admin
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Generate new token with updated status
    const authToken = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        message: 'Email verified successfully. Your account is pending admin approval.',
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
        },
      },
      { status: 200 }
    );

    // Set auth token
    response.cookies.set('auth-token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email', message: error.message },
      { status: 500 }
    );
  }
}

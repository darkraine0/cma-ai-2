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

    // TEST VERSION: Allow "1234" as universal test code for any unverified user
    let user;
    if (code === "1234") {
      // For test version, get user from auth token (user is logged in after signup)
      try {
        const userPayload = getCurrentUserFromRequest(request);
        if (userPayload) {
          user = await User.findById(userPayload.userId);
          if (user && user.emailVerified) {
            return NextResponse.json(
              { error: 'Email already verified' },
              { status: 400 }
            );
          }
        }
      } catch (e) {
        // If we can't get user from token, try to find any unverified user (for testing)
      }
      
      // If no user found from token, find any unverified user (for testing)
      if (!user) {
        user = await User.findOne({ emailVerified: false });
      }
      
      if (!user) {
        return NextResponse.json(
          { error: 'No unverified user found' },
          { status: 400 }
        );
      }
    } else {
      // Production code: Find user with matching code that hasn't expired
      // Original code (commented for testing):
      // user = await User.findOne({
      //   emailVerificationToken: code,
      //   emailVerificationExpires: { $gt: new Date() },
      // });
      
      // For now, still check the token but allow expired codes in test mode
      user = await User.findOne({
        emailVerificationToken: code,
      });
      
      if (!user) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        );
      }
      
      // Check expiration (commented for testing)
      // if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      //   return NextResponse.json(
      //     { error: 'Verification code has expired' },
      //     { status: 400 }
      //   );
      // }
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

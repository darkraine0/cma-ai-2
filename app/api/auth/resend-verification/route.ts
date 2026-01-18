import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { getCurrentUserFromRequest } from '@/app/lib/auth';

/**
 * Resend email verification
 * Generates new verification token and sends email
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userPayload = getCurrentUserFromRequest(request);

    if (!userPayload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await User.findById(userPayload.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }

    // Generate new 4-digit verification code
    // TEST VERSION: Use "1234" as verification code for all users
    const verificationCode = "1234";
    // Production code (commented for testing):
    // const verificationCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code (1000-9999)
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.emailVerificationToken = verificationCode;
    user.emailVerificationExpires = verificationExpiry;
    await user.save();

    // TODO: Send email with verification code
    // For now, log to console
    console.log('=== EMAIL VERIFICATION CODE ===');
    console.log(`Verification code for ${user.email}:`);
    console.log(verificationCode);
    console.log('==============================');

    return NextResponse.json(
      {
        message: 'Verification email sent. Please check your inbox.',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification email', message: error.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { sendPasswordResetEmail } from '@/app/lib/email';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { email } = body;

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // Always return success (security best practice - don't reveal if email exists)
    // But only generate code if user exists
    if (user) {
      // Generate 4-digit verification code (1000-9999)
      const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
      const codeExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save verification code to user
      user.resetPasswordCode = verificationCode;
      user.resetPasswordCodeExpires = codeExpiry;
      await user.save();

      // Send email with verification code
      try {
        await sendPasswordResetEmail(user.email, verificationCode);
      } catch (emailError: any) {
        console.error('Failed to send password reset email:', emailError);
        // Log the code for debugging in development
        if (process.env.NODE_ENV === 'development') {
          console.log('=== PASSWORD RESET VERIFICATION CODE (Email failed, logged for dev) ===');
          console.log(`Verification code for ${user.email}:`);
          console.log(verificationCode);
          console.log('======================================================================');
        }
        // Still return success to user (security best practice - don't reveal if email exists)
      }
    }

    // Always return success message (security best practice)
    return NextResponse.json(
      {
        message: 'If an account exists with this email, you will receive password reset instructions.',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', message: error.message },
      { status: 500 }
    );
  }
}

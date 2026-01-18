import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';
import crypto from 'crypto';

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
    // But only generate token if user exists
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save reset token to user
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpiry;
      await user.save();

      // In production, send email with reset link
      // For now, log it to console (you'll need to integrate email service)
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      console.log('=== PASSWORD RESET LINK ===');
      console.log(`Reset link for ${user.email}:`);
      console.log(resetUrl);
      console.log('==========================');

      // TODO: Integrate email service (SendGrid, AWS SES, Nodemailer, etc.)
      // Example:
      // await sendEmail({
      //   to: user.email,
      //   subject: 'Password Reset Request',
      //   html: `Click here to reset your password: ${resetUrl}`
      // });
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

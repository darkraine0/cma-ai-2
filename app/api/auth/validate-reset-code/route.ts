import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { email, code } = body;

    // Validation
    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    // Find user with matching email and code that hasn't expired
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordCode: code,
      resetPasswordCodeExpires: { $gt: new Date() }, // Code not expired
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Verification code is valid' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Validate reset code error:', error);
    return NextResponse.json(
      { error: 'Failed to validate code', message: error.message },
      { status: 500 }
    );
  }
}

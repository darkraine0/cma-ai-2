import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User, { UserRole, UserStatus, UserPermission } from '@/app/models/User';
import { hashPassword, generateToken } from '@/app/lib/auth';
import { sendVerificationEmail } from '@/app/lib/email';

export async function POST(request: NextRequest) {
  try {
    // Connect to database with error handling
    try {
      await connectDB();
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { 
          error: 'Database connection failed. Please check your MongoDB connection.',
          message: dbError.message 
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, password, name } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Check if this is the first user (auto-assign as admin)
    let userCount = 0;
    let isFirstUser = false;
    try {
      userCount = await User.countDocuments();
      isFirstUser = userCount === 0;
    } catch (countError: any) {
      console.error('Error counting users:', countError);
      // Continue anyway - will default to user role
    }

    // Generate 4-digit email verification code
    const emailVerificationToken = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code (1000-9999)
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user with appropriate role and status
    try {
      const user = new User({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name?.trim(),
        role: isFirstUser ? UserRole.ADMIN : UserRole.USER,
        permission: UserPermission.VIEWER, // Default permission
        status: isFirstUser ? UserStatus.APPROVED : UserStatus.PENDING, // First user auto-approved
        emailVerified: false,
        emailVerificationToken,
        emailVerificationExpires,
      });

      await user.save();

      // Send verification email with code
      try {
        await sendVerificationEmail(user.email, emailVerificationToken);
      } catch (emailError: any) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail the signup if email fails - user can request resend
        // Log the code for debugging in development
        if (process.env.NODE_ENV === 'development') {
          console.log('=== EMAIL VERIFICATION CODE (Email failed, logged for dev) ===');
          console.log(`New user: ${user.email}`);
          console.log(`Role: ${user.role} | Status: ${user.status}`);
          console.log(`Verification code: ${emailVerificationToken}`);
          console.log('===============================================================');
        }
      }

      // Don't set token on signup - user must verify email first
      // Token will be set after email verification in verify-email route
      const response = NextResponse.json(
        {
          message: isFirstUser 
            ? 'Admin account created successfully. Please verify your email.'
            : 'Account created successfully. Please verify your email and wait for admin approval.',
          user: {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
          },
          requiresVerification: true,
        },
        { status: 201 }
      );

      return response;
    } catch (saveError: any) {
      console.error('Error saving user:', saveError);
      if (saveError.code === 11000) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
      throw saveError; // Re-throw to be caught by outer catch
    }

  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create user', message: error.message },
      { status: 500 }
    );
  }
}

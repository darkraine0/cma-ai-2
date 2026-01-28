import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';
import PermissionRequest from '@/app/models/PermissionRequest';
import { getCurrentUserFromRequest } from '@/app/lib/auth';
import { RequestStatus } from '@/app/models/PermissionRequest';

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
    
    const user = await User.findById(tokenPayload.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Business rules validation
    if (user.role === 'admin') {
      return NextResponse.json(
        { error: 'Admins already have full access' },
        { status: 400 }
      );
    }

    if (user.permission === 'editor') {
      return NextResponse.json(
        { error: 'You already have editor permission' },
        { status: 400 }
      );
    }

    // Check for existing pending request
    const existingRequest = await PermissionRequest.findOne({
      userId: user._id,
      status: RequestStatus.PENDING,
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending permission request' },
        { status: 400 }
      );
    }

    // Create permission request
    const permissionRequest = new PermissionRequest({
      userId: user._id,
      currentPermission: user.permission,
      requestedPermission: 'editor',
      status: RequestStatus.PENDING,
      requestedAt: new Date(),
    });

    await permissionRequest.save();

    return NextResponse.json({
      message: 'Permission request submitted successfully. An admin will review your request.',
      request: {
        id: permissionRequest._id.toString(),
        status: permissionRequest.status,
        requestedAt: permissionRequest.requestedAt,
      },
    });
  } catch (error: any) {
    console.error('Request permission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit permission request', message: error.message },
      { status: 500 }
    );
  }
}

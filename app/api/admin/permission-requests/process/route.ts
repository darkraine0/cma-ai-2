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
    
    // Verify admin role
    const admin = await User.findById(tokenPayload.userId);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requestId, status } = body;

    // Validation
    if (!requestId || !status) {
      return NextResponse.json(
        { error: 'Request ID and status are required' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be approved or rejected' },
        { status: 400 }
      );
    }

    // Find the permission request
    const permissionRequest = await PermissionRequest.findById(requestId);
    if (!permissionRequest) {
      return NextResponse.json(
        { error: 'Permission request not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (permissionRequest.status !== RequestStatus.PENDING) {
      return NextResponse.json(
        { error: 'This request has already been processed' },
        { status: 400 }
      );
    }

    // Update permission request
    permissionRequest.status = status === 'approved' ? RequestStatus.APPROVED : RequestStatus.REJECTED;
    permissionRequest.processedAt = new Date();
    permissionRequest.processedBy = admin._id;
    await permissionRequest.save();

    // If approved, update user permission
    if (status === 'approved') {
      const user = await User.findById(permissionRequest.userId);
      if (user) {
        user.permission = permissionRequest.requestedPermission;
        await user.save();
      }
    }

    return NextResponse.json({
      message: `Permission request ${status} successfully`,
      request: {
        id: permissionRequest._id.toString(),
        status: permissionRequest.status,
        processedAt: permissionRequest.processedAt,
      },
    });
  } catch (error: any) {
    console.error('Process permission request error:', error);
    return NextResponse.json(
      { error: 'Failed to process permission request', message: error.message },
      { status: 500 }
    );
  }
}

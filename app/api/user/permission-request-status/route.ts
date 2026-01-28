import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import PermissionRequest from '@/app/models/PermissionRequest';
import { getCurrentUserFromRequest } from '@/app/lib/auth';
import { RequestStatus } from '@/app/models/PermissionRequest';

export async function GET(request: NextRequest) {
  try {
    const tokenPayload = getCurrentUserFromRequest(request);
    
    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Find pending request for this user
    const pendingRequest = await PermissionRequest.findOne({
      userId: tokenPayload.userId,
      status: RequestStatus.PENDING,
    }).sort({ requestedAt: -1 });

    if (!pendingRequest) {
      return NextResponse.json({
        hasPendingRequest: false,
        request: null,
      });
    }

    return NextResponse.json({
      hasPendingRequest: true,
      request: {
        id: pendingRequest._id.toString(),
        currentPermission: pendingRequest.currentPermission,
        requestedPermission: pendingRequest.requestedPermission,
        status: pendingRequest.status,
        requestedAt: pendingRequest.requestedAt,
      },
    });
  } catch (error: any) {
    console.error('Get permission request status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request status', message: error.message },
      { status: 500 }
    );
  }
}

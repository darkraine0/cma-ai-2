import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';
import PermissionRequest from '@/app/models/PermissionRequest';
import { getCurrentUserFromRequest } from '@/app/lib/auth';

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
    
    // Verify admin role
    const user = await User.findById(tokenPayload.userId);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden. Admin access required.' },
        { status: 403 }
      );
    }

    // Fetch all permission requests with user details
    const requests = await PermissionRequest.find()
      .populate('userId', 'name email')
      .populate('processedBy', 'name email')
      .sort({ requestedAt: -1 })
      .lean();

    return NextResponse.json({
      requests: requests.map((req: any) => ({
        id: req._id.toString(),
        user: {
          id: req.userId?._id?.toString(),
          name: req.userId?.name,
          email: req.userId?.email,
        },
        currentPermission: req.currentPermission,
        requestedPermission: req.requestedPermission,
        status: req.status,
        requestedAt: req.requestedAt,
        processedAt: req.processedAt,
        processedBy: req.processedBy ? {
          id: req.processedBy._id.toString(),
          name: req.processedBy.name,
          email: req.processedBy.email,
        } : null,
      })),
    });
  } catch (error: any) {
    console.error('Get permission requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permission requests', message: error.message },
      { status: 500 }
    );
  }
}

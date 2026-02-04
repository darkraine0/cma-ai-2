import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Community from '@/app/models/Community';
import mongoose from 'mongoose';
import { requirePermission } from '@/app/lib/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) return permissionCheck;

    await connectDB();
    const resolvedParams = params instanceof Promise ? await params : params;
    const communityId = resolvedParams.id;

    if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
      return NextResponse.json(
        { error: 'Valid community ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { parentCommunityId, description, location } = body;

    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    if (parentCommunityId !== undefined) {
      if (parentCommunityId === null || parentCommunityId === '') {
        community.parentCommunityId = undefined;
      } else {
        if (!mongoose.Types.ObjectId.isValid(parentCommunityId)) {
          return NextResponse.json(
            { error: 'Invalid parent community ID' },
            { status: 400 }
          );
        }
        const parentExists = await Community.findById(parentCommunityId);
        if (!parentExists) {
          return NextResponse.json(
            { error: 'Parent community not found' },
            { status: 404 }
          );
        }
        if (parentCommunityId === communityId) {
          return NextResponse.json(
            { error: 'A community cannot be its own parent' },
            { status: 400 }
          );
        }
        community.parentCommunityId = new mongoose.Types.ObjectId(parentCommunityId);
      }
    }

    if (description !== undefined) community.description = description ?? null;
    if (location !== undefined) community.location = location ?? null;

    await community.save();

    const updated = await Community.findById(communityId)
      .populate({ path: 'parentCommunityId', select: 'name _id' })
      .populate({ path: 'companies', select: 'name _id' });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update community', message: error.message },
      { status: 500 }
    );
  }
}

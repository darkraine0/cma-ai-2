import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/mongodb';
import ProductSegment from '@/app/models/ProductSegment';
import Community from '@/app/models/Community';
import { requirePermission } from '@/app/lib/admin';

// GET /api/product-segments?communityId=...  -> list segments (optionally filtered by community)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    const onlyActive = searchParams.get('onlyActive') === 'true';

    const query: any = {};
    if (communityId && mongoose.Types.ObjectId.isValid(communityId)) {
      query.communityId = new mongoose.Types.ObjectId(communityId);
    }
    if (onlyActive) {
      query.isActive = true;
    }

    const segments = await ProductSegment.find(query)
      .sort({ displayOrder: 1, label: 1 })
      .populate({ path: 'communityId', select: 'name _id' });

    const result = segments.map((segment: any) => ({
      _id: segment._id.toString(),
      communityId: segment.communityId?._id?.toString() || segment.communityId?.toString(),
      communityName: segment.communityId?.name || undefined,
      name: segment.name,
      label: segment.label,
      description: segment.description || null,
      isActive: !!segment.isActive,
      displayOrder: segment.displayOrder ?? 0,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching product segments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product segments', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/product-segments  -> create new segment
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    await connectDB();
    const body = await request.json();
    const { communityId, name, label, description, isActive, displayOrder } = body;

    if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
      return NextResponse.json(
        { error: 'Valid communityId is required' },
        { status: 400 }
      );
    }
    if (!name || !label) {
      return NextResponse.json(
        { error: 'Segment name and label are required' },
        { status: 400 }
      );
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    const existing = await ProductSegment.findOne({
      communityId,
      name: name.trim(),
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A segment with this name already exists in this community' },
        { status: 409 }
      );
    }

    const segment = new ProductSegment({
      communityId,
      name: name.trim(),
      label: label.trim(),
      description,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      displayOrder: typeof displayOrder === 'number' ? displayOrder : 0,
    });

    await segment.save();

    return NextResponse.json(
      {
        _id: segment._id.toString(),
        communityId: segment.communityId.toString(),
        name: segment.name,
        label: segment.label,
        description: segment.description || null,
        isActive: !!segment.isActive,
        displayOrder: segment.displayOrder ?? 0,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating product segment:', error);
    return NextResponse.json(
      { error: 'Failed to create product segment', message: error.message },
      { status: 500 }
    );
  }
}


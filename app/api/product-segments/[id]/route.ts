import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/mongodb';
import ProductSegment from '@/app/models/ProductSegment';
import { requirePermission } from '@/app/lib/admin';

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) return permissionCheck;

    await connectDB();
    const { id } = await (params instanceof Promise ? params : Promise.resolve(params));
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid segment ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, label, description, isActive, displayOrder } = body;

    const segment = await ProductSegment.findById(id);
    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    if (name !== undefined && name.trim()) segment.name = name.trim();
    if (label !== undefined && label.trim()) segment.label = label.trim();
    if (description !== undefined) segment.description = description ?? null;
    if (typeof isActive === 'boolean') segment.isActive = isActive;
    if (typeof displayOrder === 'number') segment.displayOrder = displayOrder;

    await segment.save();

    return NextResponse.json({
      _id: segment._id.toString(),
      communityId: segment.communityId.toString(),
      name: segment.name,
      label: segment.label,
      description: segment.description || null,
      isActive: !!segment.isActive,
      displayOrder: segment.displayOrder ?? 0,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A segment with this name already exists in this community' },
        { status: 409 }
      );
    }
    console.error('Error updating product segment:', error);
    return NextResponse.json(
      { error: 'Failed to update product segment', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) return permissionCheck;

    await connectDB();
    const { id } = await (params instanceof Promise ? params : Promise.resolve(params));
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid segment ID is required' }, { status: 400 });
    }

    const segment = await ProductSegment.findByIdAndDelete(id);
    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, _id: id });
  } catch (error: any) {
    console.error('Error deleting product segment:', error);
    return NextResponse.json(
      { error: 'Failed to delete product segment', message: error.message },
      { status: 500 }
    );
  }
}

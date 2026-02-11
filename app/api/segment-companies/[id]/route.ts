import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/mongodb';
import SegmentCompany from '@/app/models/SegmentCompany';
import { requirePermission } from '@/app/lib/admin';

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) return permissionCheck;

    await connectDB();
    const id = await (params instanceof Promise ? params : Promise.resolve(params)).then((p) => p.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid segment-company ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { role, sourceCommunityId, notes, keyType, values, planNames } = body;

    const doc = await SegmentCompany.findById(id);
    if (!doc) {
      return NextResponse.json({ error: 'Segment company not found' }, { status: 404 });
    }

    if (role !== undefined) doc.role = role;
    if (sourceCommunityId !== undefined) {
      doc.sourceCommunityId = sourceCommunityId && mongoose.Types.ObjectId.isValid(sourceCommunityId)
        ? new mongoose.Types.ObjectId(sourceCommunityId)
        : undefined;
    }
    if (notes !== undefined) doc.notes = notes;
    if (keyType !== undefined) doc.keyType = keyType === 'Series_Name' ? 'Series_Name' : 'Plan_Names';
    if (values !== undefined) doc.values = Array.isArray(values) ? values.filter((v: unknown) => typeof v === 'string' && (v as string).trim()) : doc.values || [];
    if (planNames !== undefined) doc.planNames = Array.isArray(planNames) ? planNames.filter((v: unknown) => typeof v === 'string' && (v as string).trim()) : undefined;

    await doc.save();

    const populated = await SegmentCompany.findById(id)
      .populate({ path: 'segmentId', select: 'name label communityId' })
      .populate({ path: 'companyId', select: 'name' })
      .populate({ path: 'sourceCommunityId', select: 'name' });

    const row: any = populated;
    return NextResponse.json({
      _id: row._id.toString(),
      segmentId: row.segmentId?._id?.toString(),
      companyId: row.companyId?._id?.toString(),
      companyName: row.companyId?.name,
      role: row.role,
      sourceCommunityId: row.sourceCommunityId?._id?.toString() || null,
      sourceCommunityName: row.sourceCommunityId?.name || null,
      notes: row.notes || null,
      keyType: row.keyType || 'Plan_Names',
      values: row.values || [],
      planNames: row.planNames || [],
    });
  } catch (error: any) {
    console.error('Error updating segment company:', error);
    return NextResponse.json(
      { error: 'Failed to update segment company', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) return permissionCheck;

    await connectDB();
    const id = await (params instanceof Promise ? params : Promise.resolve(params)).then((p) => p.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid segment-company ID is required' }, { status: 400 });
    }

    const doc = await SegmentCompany.findByIdAndDelete(id);
    if (!doc) {
      return NextResponse.json({ error: 'Segment company not found' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, _id: id });
  } catch (error: any) {
    console.error('Error deleting segment company:', error);
    return NextResponse.json(
      { error: 'Failed to delete segment company', message: error.message },
      { status: 500 }
    );
  }
}

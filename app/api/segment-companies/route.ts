import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/mongodb';
import SegmentCompany from '@/app/models/SegmentCompany';
import ProductSegment from '@/app/models/ProductSegment';
import Company from '@/app/models/Company';
import { requirePermission } from '@/app/lib/admin';

// GET /api/segment-companies?segmentId=...&communityId=...
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('segmentId');
    const communityId = searchParams.get('communityId');

    const query: any = {};
    if (segmentId && mongoose.Types.ObjectId.isValid(segmentId)) {
      query.segmentId = new mongoose.Types.ObjectId(segmentId);
    }
    if (communityId && mongoose.Types.ObjectId.isValid(communityId)) {
      // Filter segment companies whose segments belong to this community
      const segmentFilter: any = { communityId: new mongoose.Types.ObjectId(communityId) };
      const segments = await ProductSegment.find(segmentFilter).select('_id');
      const segmentIds = segments.map((s) => s._id);
      if (segmentIds.length === 0) {
        return NextResponse.json([]);
      }
      query.segmentId = { $in: segmentIds };
    }

    const results = await SegmentCompany.find(query)
      .populate({ path: 'segmentId', select: 'name label communityId' })
      .populate({ path: 'companyId', select: 'name' })
      .populate({ path: 'sourceCommunityId', select: 'name' })
      .sort({ role: 1, 'companyId.name': 1 });

    const data = results.map((row: any) => ({
      _id: row._id.toString(),
      segmentId: row.segmentId?._id?.toString() || row.segmentId?.toString(),
      segmentName: row.segmentId?.name,
      segmentLabel: row.segmentId?.label,
      communityId: row.segmentId?.communityId?.toString(),
      companyId: row.companyId?._id?.toString() || row.companyId?.toString(),
      companyName: row.companyId?.name,
      role: row.role,
      sourceCommunityId: row.sourceCommunityId?._id?.toString() || row.sourceCommunityId?.toString() || null,
      sourceCommunityName: row.sourceCommunityId?.name || null,
      notes: row.notes || null,
      keyType: row.keyType || 'Plan_Names',
      values: Array.isArray(row.values) ? row.values : [],
      planNames: Array.isArray(row.planNames) ? row.planNames : [],
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching segment companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch segment companies', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/segment-companies  -> add a company to a segment
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    await connectDB();
    const body = await request.json();
    const { segmentId, companyId, role, sourceCommunityId, notes, keyType, values, planNames } = body;

    if (!segmentId || !mongoose.Types.ObjectId.isValid(segmentId)) {
      return NextResponse.json(
        { error: 'Valid segmentId is required' },
        { status: 400 }
      );
    }
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return NextResponse.json(
        { error: 'Valid companyId is required' },
        { status: 400 }
      );
    }

    const segment = await ProductSegment.findById(segmentId);
    if (!segment) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      );
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const doc = new SegmentCompany({
      segmentId,
      companyId,
      role: role || 'competitor',
      sourceCommunityId: sourceCommunityId && mongoose.Types.ObjectId.isValid(sourceCommunityId)
        ? new mongoose.Types.ObjectId(sourceCommunityId)
        : undefined,
      notes,
      keyType: keyType === 'Series_Name' ? 'Series_Name' : 'Plan_Names',
      values: Array.isArray(values) ? values.filter((v: unknown) => typeof v === 'string' && v.trim()) : [],
      planNames: Array.isArray(planNames) ? planNames.filter((v: unknown) => typeof v === 'string' && v.trim()) : undefined,
    });

    await doc.save();

    return NextResponse.json(
      {
        _id: doc._id.toString(),
        segmentId: doc.segmentId.toString(),
        companyId: doc.companyId.toString(),
        role: doc.role,
        sourceCommunityId: doc.sourceCommunityId?.toString() || null,
        notes: doc.notes || null,
        keyType: doc.keyType,
        values: doc.values || [],
        planNames: doc.planNames || [],
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'This company is already registered in this segment with this role' },
        { status: 409 }
      );
    }

    console.error('Error creating segment company mapping:', error);
    return NextResponse.json(
      { error: 'Failed to create segment company mapping', message: error.message },
      { status: 500 }
    );
  }
}


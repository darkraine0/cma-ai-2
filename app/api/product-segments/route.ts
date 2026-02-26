import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/mongodb';
import ProductSegment from '@/app/models/ProductSegment';
import Community from '@/app/models/Community';
import Company from '@/app/models/Company';
import { requirePermission } from '@/app/lib/admin';

// GET /api/product-segments?communityId=...&companyId=...  -> list segments (optionally by community and/or builder)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    const companyId = searchParams.get('companyId');
    const onlyActive = searchParams.get('onlyActive') === 'true';

    const query: Record<string, unknown> = {};
    if (communityId && mongoose.Types.ObjectId.isValid(communityId)) {
      query.communityId = new mongoose.Types.ObjectId(communityId);
    }
    if (searchParams.has('companyId')) {
      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        query.companyId = new mongoose.Types.ObjectId(companyId);
      } else {
        // companyId= or companyId=empty → community-wide segments only
        query.$or = [{ companyId: null }, { companyId: { $exists: false } }];
      }
    }
    if (onlyActive) {
      query.isActive = true;
    }

    const segments = await ProductSegment.find(query)
      .sort({ displayOrder: 1, label: 1 })
      .lean();

    const communityIds = [...new Set(segments.map((s: any) => s.communityId?.toString()).filter(Boolean))];
    const companyIds = [...new Set(segments.map((s: any) => s.companyId?.toString()).filter(Boolean))];

    let communityMap: Record<string, { _id: string; name: string }> = {};
    let companyMap: Record<string, { _id: string; name: string }> = {};

    if (communityIds.length > 0) {
      const communities = await Community.find({ _id: { $in: communityIds.map((id) => new mongoose.Types.ObjectId(id)) } })
        .select('name _id')
        .lean();
      communityMap = Object.fromEntries(communities.map((c: any) => [c._id.toString(), { _id: c._id.toString(), name: c.name }]));
    }
    if (companyIds.length > 0) {
      const companies = await Company.find({ _id: { $in: companyIds.map((id) => new mongoose.Types.ObjectId(id)) } })
        .select('name _id')
        .lean();
      companyMap = Object.fromEntries(companies.map((c: any) => [c._id.toString(), { _id: c._id.toString(), name: c.name }]));
    }

    const result = segments.map((segment: any) => {
      const cid = segment.communityId?.toString?.() ?? segment.communityId;
      const coid = segment.companyId?.toString?.() ?? segment.companyId;
      return {
        _id: segment._id.toString(),
        communityId: cid ?? null,
        communityName: cid ? communityMap[cid]?.name : undefined,
        companyId: coid ?? null,
        companyName: coid ? companyMap[coid]?.name : undefined,
        name: segment.name,
        label: segment.label,
        description: segment.description ?? null,
        isActive: !!segment.isActive,
        displayOrder: segment.displayOrder ?? 0,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching product segments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product segments', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/product-segments  -> create new segment (optionally scoped to a builder via companyId)
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    await connectDB();
    const body = await request.json();
    const { communityId, companyId, name, label, description, isActive, displayOrder } = body;

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

    const segCompanyId = companyId && mongoose.Types.ObjectId.isValid(companyId)
      ? new mongoose.Types.ObjectId(companyId)
      : null;

    if (segCompanyId) {
      const companyInCommunity = community.companies.some(
        (c: mongoose.Types.ObjectId) => c.toString() === segCompanyId.toString()
      );
      if (!companyInCommunity) {
        return NextResponse.json(
          { error: 'Company is not in this community' },
          { status: 400 }
        );
      }
    }

    const existingQuery: Record<string, unknown> = {
      communityId: new mongoose.Types.ObjectId(communityId),
      name: name.trim(),
    };
    if (segCompanyId) {
      existingQuery.companyId = segCompanyId;
    } else {
      existingQuery.$or = [{ companyId: null }, { companyId: { $exists: false } }];
    }
    const existing = await ProductSegment.findOne(existingQuery);
    if (existing) {
      return NextResponse.json(
        { error: 'A segment with this name already exists for this community and builder' },
        { status: 409 }
      );
    }

    const segment = new ProductSegment({
      communityId: new mongoose.Types.ObjectId(communityId),
      companyId: segCompanyId,
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
        companyId: segment.companyId?.toString() ?? null,
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


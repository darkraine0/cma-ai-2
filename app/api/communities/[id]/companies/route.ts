import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Community from '@/app/models/Community';
import Company from '@/app/models/Company';
import CommunityCompany from '@/app/models/CommunityCompany';
import Plan from '@/app/models/Plan';
import PriceHistory from '@/app/models/PriceHistory';
import mongoose from 'mongoose';
import { requirePermission } from '@/app/lib/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Check editor permission (async)
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    await connectDB();
    const body = await request.json();
    const { companyId, companyName, nameUsedByCompany } = body; // nameUsedByCompany = alias for scrape/AI
    
    // Handle params as either Promise or direct object (for Next.js version compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const communityId = resolvedParams.id;

    if (!communityId) {
      return NextResponse.json(
        { error: 'Community ID is required' },
        { status: 400 }
      );
    }

    // Validate that communityId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      return NextResponse.json(
        { error: 'Invalid community ID format' },
        { status: 400 }
      );
    }

    // Require either companyId or companyName
    if (!companyId && (!companyName || !companyName.trim())) {
      return NextResponse.json(
        { error: 'Company ID or name is required' },
        { status: 400 }
      );
    }

    // Find community by ID
    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Find company by ID if provided, otherwise by name
    let company;
    if (companyId) {
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return NextResponse.json(
          { error: 'Invalid company ID format' },
          { status: 400 }
        );
      }
      company = await Company.findById(companyId);
    } else {
      // Find by name (case-insensitive)
      const escapedName = companyName!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      company = await Company.findOne({ 
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
      });
    }

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Ensure company._id is a proper ObjectId
    let companyObjectId: mongoose.Types.ObjectId;
    if (company._id instanceof mongoose.Types.ObjectId) {
      companyObjectId = company._id;
    } else if (typeof company._id === 'string' && mongoose.Types.ObjectId.isValid(company._id)) {
      companyObjectId = new mongoose.Types.ObjectId(company._id);
    } else {
      return NextResponse.json(
        { error: 'Invalid company ID format' },
        { status: 400 }
      );
    }

    // Check if company is already in the community
    const companyExists = community.companies.some(
      (c: any) => c.toString() === companyObjectId.toString()
    );

    if (companyExists) {
      return NextResponse.json(
        { error: 'Company is already in this community' },
        { status: 409 }
      );
    }

    // Add company to community
    community.companies.push(companyObjectId);
    await community.save();

    // Upsert alias: name this company uses for this community (for scrape/identify)
    const aliasValue =
      nameUsedByCompany != null && String(nameUsedByCompany).trim()
        ? String(nameUsedByCompany).trim()
        : null;
    await CommunityCompany.findOneAndUpdate(
      { communityId: community._id, companyId: companyObjectId },
      aliasValue ? { $set: { nameUsedByCompany: aliasValue } } : { $unset: { nameUsedByCompany: 1 } },
      { upsert: true, new: true }
    );

    // Reload community from database and populate companies to return updated data
    const updatedCommunity = await Community.findById(community._id).populate({
      path: 'companies',
      model: mongoose.models.Company || 'Company',
      select: 'name _id',
    });

    if (!updatedCommunity) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated community after adding company' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Company added to community successfully', 
        community: updatedCommunity 
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to add company to community', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Check editor permission (async)
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const companyName = searchParams.get('company'); // Backward compatibility
    
    // Handle params as either Promise or direct object (for Next.js version compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const communityId = resolvedParams.id;

    if (!communityId) {
      return NextResponse.json(
        { error: 'Community ID is required' },
        { status: 400 }
      );
    }

    // Validate that communityId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      return NextResponse.json(
        { error: 'Invalid community ID format' },
        { status: 400 }
      );
    }

    if (!companyId && !companyName) {
      return NextResponse.json(
        { error: 'Company ID or name is required' },
        { status: 400 }
      );
    }

    // Find company to get its ID
    let company;
    if (companyId) {
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return NextResponse.json(
          { error: 'Invalid company ID format' },
          { status: 400 }
        );
      }
      company = await Company.findById(companyId);
      if (!company) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
    } else {
      // Find by name (case-insensitive)
      const escapedName = companyName!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      company = await Company.findOne({ 
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
      });
      if (!company) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
    }

    // Find community by ID
    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Ensure company._id is a proper ObjectId
    let companyObjectId: mongoose.Types.ObjectId;
    if (company._id instanceof mongoose.Types.ObjectId) {
      companyObjectId = company._id;
    } else if (typeof company._id === 'string' && mongoose.Types.ObjectId.isValid(company._id)) {
      companyObjectId = new mongoose.Types.ObjectId(company._id);
    } else {
      return NextResponse.json(
        { error: 'Invalid company ID format' },
        { status: 400 }
      );
    }

    // Remove alias if present
    await CommunityCompany.deleteOne({
      communityId: community._id,
      companyId: companyObjectId,
    });

    // Delete all plans for this company in this community (and their price history)
    const planIds = await Plan.distinct('_id', {
      'community._id': new mongoose.Types.ObjectId(communityId),
      'company._id': companyObjectId,
    });
    if (planIds.length > 0) {
      await PriceHistory.deleteMany({ plan_id: { $in: planIds } });
      await Plan.deleteMany({
        'community._id': new mongoose.Types.ObjectId(communityId),
        'company._id': companyObjectId,
      });
    }

    // Use MongoDB's $pull operator to remove the company ID
    const updateResult = await Community.updateOne(
      { _id: community._id },
      { $pull: { companies: companyObjectId } }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Reload community from database and populate companies to return updated data
    const updatedCommunity = await Community.findById(community._id).populate({
      path: 'companies',
      model: mongoose.models.Company || 'Company',
      select: 'name _id',
    });

    if (!updatedCommunity) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated community after removal' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Company removed from community successfully', 
        community: updatedCommunity 
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to remove company from community', message: error.message },
      { status: 500 }
    );
  }
}

/** PATCH: Update the "name used by company" alias (company must already be in community). */
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
      return NextResponse.json({ error: 'Valid community ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { companyId, companyName, nameUsedByCompany } = body;
    if (!companyId && (!companyName || !String(companyName).trim())) {
      return NextResponse.json({ error: 'Company ID or name is required' }, { status: 400 });
    }

    const community = await Community.findById(communityId);
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 });

    let company;
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      company = await Company.findById(companyId);
    } else {
      const escaped = String(companyName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      company = await Company.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
    }
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const companyObjectId = company._id instanceof mongoose.Types.ObjectId
      ? company._id
      : new mongoose.Types.ObjectId(String(company._id));
    const inCommunity = community.companies.some((c: any) => c.toString() === companyObjectId.toString());
    if (!inCommunity) {
      return NextResponse.json(
        { error: 'Company is not in this community; add company first or use POST' },
        { status: 400 }
      );
    }

    const aliasValue =
      nameUsedByCompany != null && String(nameUsedByCompany).trim()
        ? String(nameUsedByCompany).trim()
        : null;
    const link = await CommunityCompany.findOneAndUpdate(
      { communityId: community._id, companyId: companyObjectId },
      aliasValue ? { $set: { nameUsedByCompany: aliasValue } } : { $unset: { nameUsedByCompany: 1 } },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: 'Alias updated',
      communityId: community._id.toString(),
      companyId: companyObjectId.toString(),
      nameUsedByCompany: link?.nameUsedByCompany ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update alias', message: error.message },
      { status: 500 }
    );
  }
}


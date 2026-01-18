import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Community from '@/app/models/Community';
import Company from '@/app/models/Company';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB();
    const body = await request.json();
    const { companyId, companyName } = body; // Accept both ID and name for backward compatibility
    
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


import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Community from '@/app/models/Community';
import Company from '@/app/models/Company';
import mongoose from 'mongoose';
import { requirePermission } from '@/app/lib/admin';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Ensure Company model is registered on the connection
    // In Next.js serverless, models need to be accessed after connection
    if (!mongoose.models.Company) {
      // Force model registration by accessing the imported model
      // This triggers the model registration in Company.ts
      Company;
    }
    
    const { searchParams } = new URL(request.url);
    const includeChildren = searchParams.get('includeChildren') === 'true';
    const parentsOnly = searchParams.get('parentsOnly') === 'true';
    const parentId = searchParams.get('parentId');
    const linkableAsSubcommunity = searchParams.get('linkableAsSubcommunity') === 'true';
    
    let query: any = {};
    
    // If parentId is set, return only child communities of that parent
    if (parentId && mongoose.Types.ObjectId.isValid(parentId)) {
      query.parentCommunityId = new mongoose.Types.ObjectId(parentId);
    } else if (linkableAsSubcommunity) {
      // Communities that have no parent (missing or null) AND are not themselves a parent — can be linked as subcommunity
      query.$or = [
        { parentCommunityId: { $exists: false } },
        { parentCommunityId: null },
      ];
    } else if (parentsOnly) {
      // If parentsOnly is true, return communities that are parents: no parent (field missing or null)
      query.$or = [
        { parentCommunityId: { $exists: false } },
        { parentCommunityId: null },
      ];
    }
    
    let communities = await Community.find(query)
      .sort({ name: 1 })
      .populate({
        path: 'companies',
        model: mongoose.models.Company,
        select: 'name _id',
      })
      .populate({
        path: 'parentCommunityId',
        select: 'name _id',
      });

    // If linkableAsSubcommunity, exclude communities that are parents (have any children)
    if (linkableAsSubcommunity && communities.length > 0) {
      const ids = communities.map((c: any) => c._id);
      const parentIdsWithChildren = await Community.distinct('parentCommunityId', {
        parentCommunityId: { $in: ids, $exists: true }
      });
      const parentIdSet = new Set(parentIdsWithChildren.map((id: any) => id?.toString()).filter(Boolean));
      communities = communities.filter((c: any) => !parentIdSet.has(c._id.toString()));
    }
    
    // If includeChildren is true, also fetch child communities for each parent
    let communitiesWithChildren = communities;
    if (includeChildren && parentsOnly) {
      const parentIds = communities.map((c: any) => c._id);
      const children = await Community.find({
        parentCommunityId: { $in: parentIds }
      })
        .sort({ name: 1 })
        .populate({
          path: 'companies',
          model: mongoose.models.Company,
          select: 'name _id',
        });
      
      // Group children by parent
      const childrenByParent = new Map();
      children.forEach((child: any) => {
        const parentId = child.parentCommunityId?.toString();
        if (parentId) {
          if (!childrenByParent.has(parentId)) {
            childrenByParent.set(parentId, []);
          }
          childrenByParent.get(parentId).push(child);
        }
      });
      
      // Attach children to parents
      communitiesWithChildren = communities.map((parent: any) => {
        const parentId = parent._id.toString();
        return {
          ...parent.toObject(),
          children: childrenByParent.get(parentId) || []
        };
      });
    }
    
    // Map to response format
    const result = communitiesWithChildren.map((community: any) => ({
      _id: community._id.toString(),
      name: community.name,
      description: community.description || null,
      location: community.location || null,
      parentCommunityId: community.parentCommunityId 
        ? (typeof community.parentCommunityId === 'object' 
          ? { _id: community.parentCommunityId._id.toString(), name: community.parentCommunityId.name }
          : community.parentCommunityId.toString())
        : null,
      companies: (community.companies || [])
        .map((c: any) => {
          // Handle populated companies (objects with _id and name)
          if (c && typeof c === 'object' && c._id && c.name) {
            return {
              _id: c._id.toString(),
              name: c.name,
            };
          }
          // If populate failed or is an ObjectId, skip it
          return null;
        })
        .filter((company: any) => company !== null), // Filter out null entries
      children: community.children ? community.children.map((child: any) => ({
        _id: child._id.toString(),
        name: child.name,
        description: child.description || null,
        location: child.location || null,
        companies: (child.companies || [])
          .map((c: any) => {
            if (c && typeof c === 'object' && c._id && c.name) {
              return {
                _id: c._id.toString(),
                name: c.name,
              };
            }
            return null;
          })
          .filter((company: any) => company !== null),
        fromPlans: false,
      })) : undefined,
      fromPlans: false, // All communities from database are not from plans
    }));
    
    return NextResponse.json(result);
  } catch (error: any) {
    // Log detailed error for debugging (server-side only)
    console.error('Error fetching communities:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });

    // Provide user-friendly error message
    let errorMessage = 'Failed to fetch communities';
    if (error.message?.includes('MONGODB_URI')) {
      errorMessage = 'Database configuration error';
    } else if (error.message?.includes('timeout') || error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Database connection failed. Please check your database configuration.';
    }

    return NextResponse.json(
      { 
        error: errorMessage, 
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching communities'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check editor permission (async)
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    await connectDB();
    const body = await request.json();
    const { name, description, location, parentCommunityId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Community name is required' },
        { status: 400 }
      );
    }

    // Check if community already exists
    const existingCommunity = await Community.findOne({ name: name.trim() });
    if (existingCommunity) {
      return NextResponse.json(
        { error: 'Community already exists' },
        { status: 409 }
      );
    }

    // Validate parentCommunityId if provided
    if (parentCommunityId) {
      const parentExists = await Community.findById(parentCommunityId);
      if (!parentExists) {
        return NextResponse.json(
          { error: 'Parent community not found' },
          { status: 404 }
        );
      }
    }

    const community = new Community({
      name: name.trim(),
      description,
      location,
      companies: [],
      parentCommunityId: parentCommunityId || null,
    });

    await community.save();
    return NextResponse.json(community, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Community already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create community', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check editor permission (async)
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';

    // Delete all communities
    if (deleteAll) {
      const result = await Community.deleteMany({});
      return NextResponse.json(
        { 
          message: `Successfully deleted ${result.deletedCount} communit${result.deletedCount === 1 ? 'y' : 'ies'}`,
          deletedCount: result.deletedCount 
        },
        { status: 200 }
      );
    }

    // Delete single community by ID
    if (!id) {
      return NextResponse.json(
        { error: 'Community ID is required' },
        { status: 400 }
      );
    }

    const community = await Community.findByIdAndDelete(id);
    
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Community deleted successfully', community },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete community', message: error.message },
      { status: 500 }
    );
  }
}


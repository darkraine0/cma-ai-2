import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Community from '@/app/models/Community';
import Company from '@/app/models/Company';
import Plan from '@/app/models/Plan';
import ProductSegment from '@/app/models/ProductSegment';
import CommunityCompany from '@/app/models/CommunityCompany';
import SegmentCompany from '@/app/models/SegmentCompany';
import PriceHistory from '@/app/models/PriceHistory';
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
      // Only competitor-type communities that have no parent (missing or null) AND are not themselves a parent — can be linked as subcommunity
      query.$or = [
        { parentCommunityId: { $exists: false } },
        { parentCommunityId: null },
      ];
      query.communityType = 'competitor';
    } else if (parentsOnly) {
      // If parentsOnly is true, return communities that are parents: no parent (field missing or null)
      query.$or = [
        { parentCommunityId: { $exists: false } },
        { parentCommunityId: null },
      ];
      // List page shows only standard (UnionMain) communities, not competitor/sub-communities
      query.communityType = 'standard';
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

    // Compute plan-based stats (totalPlans, totalNow, avgPrice, minPrice, maxPrice) from Plan collection
    const parentIds = communities.map((c: any) => c._id);
    let childrenForStats: any[] = [];
    if (parentsOnly && parentIds.length > 0) {
      childrenForStats = await Community.find(
        { parentCommunityId: { $in: parentIds } },
        { _id: 1 }
      );
    }
    const parentToAllIds = new Map<string, mongoose.Types.ObjectId[]>();
    communities.forEach((c: any) => {
      const pid = c._id.toString();
      parentToAllIds.set(pid, [c._id]);
    });
    childrenForStats.forEach((child: any) => {
      const parentId = child.parentCommunityId?.toString();
      if (parentId && parentToAllIds.has(parentId)) {
        parentToAllIds.get(parentId)!.push(child._id);
      }
    });
    const allCommunityIds = Array.from(new Set(
      parentToAllIds.size > 0
        ? ([] as mongoose.Types.ObjectId[]).concat(...parentToAllIds.values())
        : communitiesWithChildren.map((c: any) => c._id)
    ));
    const allIdsAsObjectIds = allCommunityIds.map((id: any) =>
      typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
    );

    let statsByCommunityId = new Map<string, { totalPlans: number; totalNow: number; totalPrice: number; planCount: number; minPrice: number; maxPrice: number }>();
    if (allIdsAsObjectIds.length > 0 && mongoose.models.Plan) {
      const planStats = await Plan.aggregate([
        { $match: { 'community._id': { $in: allIdsAsObjectIds } } },
        {
          $group: {
            _id: '$community._id',
            totalPlans: { $sum: { $cond: [{ $eq: ['$type', 'plan'] }, 1, 0] } },
            totalNow: { $sum: { $cond: [{ $eq: ['$type', 'now'] }, 1, 0] } },
            totalPrice: { $sum: '$price' },
            planCount: { $sum: 1 },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
          },
        },
      ]);
      planStats.forEach((row: any) => {
        const id = row._id?.toString();
        if (id) {
          statsByCommunityId.set(id, {
            totalPlans: row.totalPlans ?? 0,
            totalNow: row.totalNow ?? 0,
            totalPrice: row.totalPrice ?? 0,
            planCount: row.planCount ?? 0,
            minPrice: row.minPrice ?? 0,
            maxPrice: row.maxPrice ?? 0,
          });
        }
      });
    }

    function getMergedStats(communityIds: mongoose.Types.ObjectId[]) {
      let totalPlans = 0;
      let totalNow = 0;
      let totalPrice = 0;
      let planCount = 0;
      let minPrice = Infinity;
      let maxPrice = -Infinity;
      communityIds.forEach((id) => {
        const sid = id.toString();
        const s = statsByCommunityId.get(sid);
        if (s) {
          totalPlans += s.totalPlans;
          totalNow += s.totalNow;
          totalPrice += s.totalPrice;
          planCount += s.planCount;
          if (s.minPrice != null && s.minPrice < minPrice) minPrice = s.minPrice;
          if (s.maxPrice != null && s.maxPrice > maxPrice) maxPrice = s.maxPrice;
        }
      });
      const avgPrice = planCount > 0 ? Math.round(totalPrice / planCount) : 0;
      return {
        totalPlans,
        totalQuickMoveIns: totalNow,
        avgPrice,
        minPrice: minPrice === Infinity ? 0 : minPrice,
        maxPrice: maxPrice === -Infinity ? 0 : maxPrice,
      };
    }
    
    // Map to response format
    const result = communitiesWithChildren.map((community: any) => {
      const cid = community._id.toString();
      const idsForStats = parentToAllIds.get(cid) || [community._id];
      const merged = getMergedStats(idsForStats);
      return {
      _id: community._id.toString(),
      name: community.name,
      communityType: community.communityType || 'standard',
      homesSource: community.homesSource || 'scraped',
      description: community.description || null,
      location: community.location || null,
      hasImage: !!(community.imagePath || community.imageData),
      imagePath: community.imagePath || null,
      totalPlans: merged.totalPlans,
      totalQuickMoveIns: merged.totalQuickMoveIns,
      avgPrice: merged.avgPrice,
      minPrice: merged.minPrice,
      maxPrice: merged.maxPrice,
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
      children: community.children ? community.children.map((child: any) => {
        const childMerged = getMergedStats([child._id]);
        return {
        _id: child._id.toString(),
        name: child.name,
        communityType: child.communityType || 'standard',
        homesSource: child.homesSource || 'scraped',
        description: child.description || null,
        location: child.location || null,
        hasImage: !!(child.imagePath || child.imageData),
        imagePath: child.imagePath || null,
        totalPlans: childMerged.totalPlans,
        totalQuickMoveIns: childMerged.totalQuickMoveIns,
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
      };
      }) : undefined,
      fromPlans: false, // All communities from database are not from plans
    };
    });
    
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
    const { name, description, location, parentCommunityId, imagePath, imageData, communityType, homesSource } = body;

    const validCommunityType = communityType === 'competitor' ? 'competitor' : 'standard';
    const validHomesSource = homesSource === 'manual' ? 'manual' : 'scraped';

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
      imagePath: imagePath || undefined,
      imageData: imageData || undefined,
      companies: [],
      parentCommunityId: parentCommunityId || null,
      communityType: validCommunityType,
      homesSource: validHomesSource,
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

/**
 * Permanently deletes a community and all related data (cascade).
 * Also recursively deletes all subcommunities so nothing is left behind (avoids orphan/duplicate data on sync).
 */
async function deleteCommunityCascade(communityId: mongoose.Types.ObjectId): Promise<{ deleted: boolean; community?: any }> {
  const community = await Community.findById(communityId);
  if (!community) {
    return { deleted: false };
  }

  // 1. Recursively delete all subcommunities first (so they are fully removed, not orphaned)
  const childCommunities = await Community.find({ parentCommunityId: communityId }).select('_id').lean();
  for (const child of childCommunities) {
    await deleteCommunityCascade(child._id as mongoose.Types.ObjectId);
  }

  // 2. Delete plans for this community and their price history
  const planIds = await Plan.distinct('_id', { 'community._id': communityId });
  if (planIds.length > 0) {
    await PriceHistory.deleteMany({ plan_id: { $in: planIds } });
    await Plan.deleteMany({ 'community._id': communityId });
  }

  // 3. Delete product segments (product lines) and their segment-company links
  const segmentIds = await ProductSegment.distinct('_id', { communityId });
  if (segmentIds.length > 0) {
    await SegmentCompany.deleteMany({ segmentId: { $in: segmentIds } });
  }
  await ProductSegment.deleteMany({ communityId });

  // 4. Remove SegmentCompany links that reference this community as sourceCommunityId (cross-community comps)
  await SegmentCompany.deleteMany({ sourceCommunityId: communityId });

  // 5. Delete community-company links
  await CommunityCompany.deleteMany({ communityId });

  // 6. Delete the community
  await Community.findByIdAndDelete(communityId);
  return { deleted: true, community };
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

    // Delete all communities (with full cascade: related data + subcommunities)
    if (deleteAll) {
      const allCommunities = await Community.find({}).select('_id parentCommunityId').lean();
      const allIds = new Set(allCommunities.map((c: any) => c._id.toString()));
      const roots = allCommunities.filter(
        (c: any) => !c.parentCommunityId || !allIds.has(c.parentCommunityId.toString())
      );
      let deletedCount = 0;
      for (const r of roots) {
        const result = await deleteCommunityCascade(r._id as mongoose.Types.ObjectId);
        if (result.deleted) deletedCount++;
      }
      return NextResponse.json(
        {
          message: `Successfully deleted ${deletedCount} communit${deletedCount === 1 ? 'y' : 'ies'}`,
          deletedCount,
        },
        { status: 200 }
      );
    }

    // Delete single community by ID (with cascade, including all subcommunities)
    if (!id) {
      return NextResponse.json(
        { error: 'Community ID is required' },
        { status: 400 }
      );
    }

    const communityId = new mongoose.Types.ObjectId(id);
    const result = await deleteCommunityCascade(communityId);
    if (!result.deleted || !result.community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Community deleted successfully', community: result.community },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete community', message: error.message },
      { status: 500 }
    );
  }
}


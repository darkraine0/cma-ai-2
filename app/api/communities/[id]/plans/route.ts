import { NextRequest, NextResponse } from 'next/server';
import mongoose, { Types } from 'mongoose';
import connectDB from '@/app/lib/mongodb';
import Plan, { IPlan } from '@/app/models/Plan';
import PriceHistory from '@/app/models/PriceHistory';
import Community from '@/app/models/Community';
import { requirePermission } from '@/app/lib/admin';

type LeanPlan = Omit<IPlan, '_id'> & { _id: Types.ObjectId };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB();
    
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

    // If community doesn't exist, return empty plans (200) instead of 404
    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json([]);
    }

    // Calculate timestamp for 24 hours ago
    const since = new Date();
    since.setHours(since.getHours() - 24);

    // Build query filter for this specific community
    const queryFilter: any = {
      'community._id': new mongoose.Types.ObjectId(communityId),
      plan_name: { $exists: true, $ne: null },
      price: { $exists: true, $ne: null },
      'company.name': { $exists: true, $ne: null },
      'community.name': { $exists: true, $ne: null },
    };

    // Get plans for this community.
    // .lean() returns plain JS objects straight from MongoDB; this bypasses
    // any stale Mongoose model cache (a known Next.js dev-server issue) so
    // newer schema fields like `version` always come through.
    const plans = await Plan.find(queryFilter).sort({ last_updated: -1 }).lean<LeanPlan[]>();

    // Get recent price changes for these plans
    const planIds = plans.map(p => p._id);
    const recentChanges = await PriceHistory.find({
      plan_id: { $in: planIds },
      changed_at: { $gte: since },
    });

    const changedPlanIds = new Set(
      recentChanges.map((ph) => ph.plan_id.toString())
    );

    // Map to response format - maintain backward compatibility with string format
    const result = plans.map((plan) => ({
      _id: plan._id.toString(),
      plan_name: plan.plan_name,
      price: plan.price,
      sqft: plan.sqft || null,
      stories: plan.stories || null,
      price_per_sqft: plan.price_per_sqft || null,
      last_updated: plan.last_updated,
      // Return both embedded object and string for backward compatibility
      company: plan.company?.name || plan.company,
      companyObj: plan.company,
      community: plan.community?.name || plan.community,
      communityObj: plan.community,
      segment: plan.segment ? { _id: plan.segment._id.toString(), name: plan.segment.name, label: plan.segment.label } : null,
      type: plan.type,
      address: plan.address || null,
      price_changed_recently: changedPlanIds.has(plan._id.toString()),
      // 1 / 3 = V1 origin (pristine / modified). 2 / 4 = V2 origin (manual / modified).
      version: plan.version ?? null,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch plans', message: error.message },
      { status: 500 }
    );
  }
}

/** DELETE: Remove all plans for this community (and their price history). Used before full sync. */
export async function DELETE(
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

    const communityObjectId = new mongoose.Types.ObjectId(communityId);
    const planIds = await Plan.distinct('_id', { 'community._id': communityObjectId });
    if (planIds.length > 0) {
      await PriceHistory.deleteMany({ plan_id: { $in: planIds } });
      await Plan.deleteMany({ 'community._id': communityObjectId });
    }

    return NextResponse.json(
      { message: 'All plans for this community have been removed', deleted: planIds.length },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete community plans', message: error.message },
      { status: 500 }
    );
  }
}


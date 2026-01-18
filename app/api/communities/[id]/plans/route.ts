import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Plan from '@/app/models/Plan';
import PriceHistory from '@/app/models/PriceHistory';
import Community from '@/app/models/Community';
import mongoose from 'mongoose';

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

    // Verify community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
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

    // Get plans for this community
    const plans = await Plan.find(queryFilter).sort({ last_updated: -1 });

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
      type: plan.type,
      address: plan.address || null,
      price_changed_recently: changedPlanIds.has(plan._id.toString()),
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch plans', message: error.message },
      { status: 500 }
    );
  }
}


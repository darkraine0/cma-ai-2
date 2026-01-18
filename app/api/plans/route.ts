import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Plan from '@/app/models/Plan';
import PriceHistory from '@/app/models/PriceHistory';
import Company from '@/app/models/Company';
import Community from '@/app/models/Community';
import mongoose from 'mongoose';
import { requirePermission } from '@/app/lib/admin';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    
    // Calculate timestamp for 24 hours ago
    const since = new Date();
    since.setHours(since.getHours() - 24);
    
    // Build query filter
    const queryFilter: any = {
      plan_name: { $exists: true, $ne: null },
      price: { $exists: true, $ne: null },
      'company.name': { $exists: true, $ne: null },
      'community.name': { $exists: true, $ne: null },
    };
    
    // Filter by community ID if provided
    if (communityId) {
      // Validate that communityId is a valid MongoDB ObjectId
      if (mongoose.Types.ObjectId.isValid(communityId)) {
        queryFilter['community._id'] = new mongoose.Types.ObjectId(communityId);
      } else {
        return NextResponse.json(
          { error: 'Invalid community ID format' },
          { status: 400 }
        );
      }
    }
    
    // Get plans (filtered by community if communityId provided)
    const plans = await Plan.find(queryFilter).sort({ last_updated: -1 });

    // Get recent price changes
    const recentChanges = await PriceHistory.find({
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

export async function POST(request: NextRequest) {
  try {
    // Check editor permission (async)
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    await connectDB();
    const body = await request.json();
    const planData = Array.isArray(body) ? body : [body];

    const results = [];

    for (const data of planData) {
      const {
        plan_name,
        price,
        sqft,
        stories,
        price_per_sqft,
        company,
        community,
        type = 'plan',
        beds,
        baths,
        address,
        design_number,
      } = data;

      // Support both string (legacy) and object format
      const companyName = typeof company === 'string' ? company : company?.name || company;
      const communityName = typeof community === 'string' ? community : community?.name || community;

      if (!plan_name || !price || !companyName || !communityName) {
        continue;
      }

      // Find or create Company
      let companyDoc = await Company.findOne({ name: companyName.trim() });
      if (!companyDoc) {
        companyDoc = new Company({ name: companyName.trim() });
        await companyDoc.save();
      }

      // Find or create Community
      let communityDoc = await Community.findOne({ name: communityName.trim() });
      if (!communityDoc) {
        communityDoc = new Community({ name: communityName.trim() });
        await communityDoc.save();
      }

      // Prepare embedded company and community objects
      const companyRef = {
        _id: companyDoc._id,
        name: companyDoc.name,
      };

      const communityRef = {
        _id: communityDoc._id,
        name: communityDoc.name,
        location: communityDoc.location,
      };

      // Find existing plan using embedded structure
      const existingPlan = await Plan.findOne({
        plan_name,
        'company.name': companyName.trim(),
        'community.name': communityName.trim(),
        type,
      });

      if (existingPlan) {
        // Check if price changed
        if (existingPlan.price !== price) {
          // Record price history
          const priceHistory = new PriceHistory({
            plan_id: existingPlan._id,
            old_price: existingPlan.price,
            new_price: price,
            changed_at: new Date(),
          });
          await priceHistory.save();

          // Update plan
          existingPlan.price = price;
          existingPlan.last_updated = new Date();
          existingPlan.price_changed_recently = true;
        }

        // Update other fields
        if (sqft !== undefined) existingPlan.sqft = sqft;
        if (stories !== undefined) existingPlan.stories = stories;
        if (price_per_sqft !== undefined) existingPlan.price_per_sqft = price_per_sqft;
        if (beds !== undefined) existingPlan.beds = beds;
        if (baths !== undefined) existingPlan.baths = baths;
        if (address !== undefined) existingPlan.address = address;
        if (design_number !== undefined) existingPlan.design_number = design_number;

        // Update embedded references in case company/community metadata changed
        existingPlan.company = companyRef;
        existingPlan.community = communityRef;

        await existingPlan.save();
        results.push(existingPlan);
      } else {
        // Create new plan with embedded structure
        const newPlan = new Plan({
          plan_name,
          price,
          sqft,
          stories,
          price_per_sqft,
          company: companyRef,
          community: communityRef,
          type,
          beds,
          baths,
          address,
          design_number,
          last_updated: new Date(),
        });

        await newPlan.save();
        results.push(newPlan);
      }
    }

    return NextResponse.json(
      { message: 'Plans processed successfully', count: results.length },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to save plans', message: error.message },
      { status: 500 }
    );
  }
}


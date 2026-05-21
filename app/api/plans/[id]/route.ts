import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Plan from '@/app/models/Plan';
import PriceHistory from '@/app/models/PriceHistory';
import Company from '@/app/models/Company';
import Community from '@/app/models/Community';
import ProductSegment from '@/app/models/ProductSegment';
import mongoose from 'mongoose';
import { requirePermission } from '@/app/lib/admin';
import { bumpPlanVersionOnUserEdit } from '@/app/lib/planVersion';

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    await connectDB();
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid plan ID is required' },
        { status: 400 }
      );
    }

    const plan = await Plan.findById(id);
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      plan_name,
      price,
      prediction_price: predictionPriceBody,
      sqft,
      stories,
      price_per_sqft,
      company,
      community,
      type,
      beds,
      baths,
      address,
      design_number,
      segmentId,
    } = body;

    let predictionOnlyEdit = predictionPriceBody !== undefined;

    if (plan_name !== undefined) {
      predictionOnlyEdit = false;
      plan.plan_name = String(plan_name).trim();
    }
    if (predictionPriceBody !== undefined) {
      if (predictionPriceBody === null || predictionPriceBody === '') {
        plan.set('prediction_price', null);
        plan.set('prediction_updated_at', null);
        plan.set('prediction_updated_by', null);
      } else {
        const next = Number(predictionPriceBody);
        if (!Number.isFinite(next) || next < 0) {
          return NextResponse.json(
            { error: 'prediction_price must be a non-negative number' },
            { status: 400 }
          );
        }
        plan.prediction_price = next;
        plan.prediction_updated_at = new Date();
        plan.prediction_updated_by = permissionCheck.user._id;
      }
    }
    if (sqft !== undefined) predictionOnlyEdit = false;
    if (stories !== undefined) predictionOnlyEdit = false;
    if (price_per_sqft !== undefined) predictionOnlyEdit = false;
    if (beds !== undefined) predictionOnlyEdit = false;
    if (baths !== undefined) predictionOnlyEdit = false;
    if (address !== undefined) predictionOnlyEdit = false;
    if (design_number !== undefined) predictionOnlyEdit = false;
    if (type !== undefined) predictionOnlyEdit = false;
    if (company !== undefined) predictionOnlyEdit = false;
    if (community !== undefined) predictionOnlyEdit = false;
    if (segmentId !== undefined) predictionOnlyEdit = false;

    if (price !== undefined) {
      predictionOnlyEdit = false;
      const newPrice = Number(price);
      if (plan.price !== newPrice) {
        const priceHistory = new PriceHistory({
          plan_id: plan._id,
          old_price: plan.price,
          new_price: newPrice,
          changed_at: new Date(),
        });
        await priceHistory.save();
        plan.price = newPrice;
        plan.price_changed_recently = true;
      }
    }
    if (sqft !== undefined) {
      plan.sqft = sqft === null || sqft === '' ? undefined : Number(sqft);
    }
    if (stories !== undefined) plan.stories = stories === null || stories === '' ? undefined : String(stories);
    if (price_per_sqft !== undefined) plan.price_per_sqft = price_per_sqft === null || price_per_sqft === '' ? undefined : Number(price_per_sqft);
    if (beds !== undefined) plan.beds = beds === null || beds === '' ? undefined : String(beds);
    if (baths !== undefined) plan.baths = baths === null || baths === '' ? undefined : String(baths);
    if (address !== undefined) plan.address = address === null || address === '' ? undefined : String(address);
    if (design_number !== undefined) plan.design_number = design_number === null || design_number === '' ? undefined : String(design_number);
    if (type !== undefined && (type === 'plan' || type === 'now')) plan.type = type;

    if (company !== undefined) {
      const companyName = typeof company === 'string' ? company : company?.name || company;
      if (companyName) {
        let companyDoc = await Company.findOne({ name: String(companyName).trim() });
        if (!companyDoc) {
          companyDoc = new Company({ name: String(companyName).trim() });
          await companyDoc.save();
        }
        plan.company = { _id: companyDoc._id, name: companyDoc.name };
      }
    }

    if (community !== undefined) {
      const communityName = typeof community === 'string' ? community : community?.name || community;
      if (communityName) {
        let communityDoc = await Community.findOne({ name: String(communityName).trim() });
        if (!communityDoc) {
          communityDoc = new Community({ name: String(communityName).trim() });
          await communityDoc.save();
        }
        plan.community = {
          _id: communityDoc._id,
          name: communityDoc.name,
          location: communityDoc.location,
        };
      }
    }

    if (segmentId !== undefined) {
      if (segmentId === null || segmentId === '') {
        plan.segment = undefined;
      } else if (mongoose.Types.ObjectId.isValid(segmentId)) {
        const segmentDoc = await ProductSegment.findById(segmentId);
        if (segmentDoc) {
          plan.segment = {
            _id: segmentDoc._id,
            name: segmentDoc.name,
            label: segmentDoc.label,
          };
        }
      }
    }

    if (!predictionOnlyEdit) {
      plan.last_updated = new Date();
    }

    if (predictionPriceBody !== undefined || !predictionOnlyEdit) {
      plan.version = bumpPlanVersionOnUserEdit(plan.version);
    }

    await plan.save();

    return NextResponse.json({
      _id: plan._id.toString(),
      plan_name: plan.plan_name,
      price: plan.price,
      prediction_price: plan.prediction_price ?? null,
      prediction_updated_at: plan.prediction_updated_at ?? null,
      sqft: plan.sqft ?? null,
      stories: plan.stories ?? null,
      price_per_sqft: plan.price_per_sqft ?? null,
      last_updated: plan.last_updated,
      company: plan.company?.name,
      community: plan.community?.name,
      segment: plan.segment ? { _id: plan.segment._id.toString(), name: plan.segment.name, label: plan.segment.label } : null,
      type: plan.type,
      address: plan.address ?? null,
      version: plan.version,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update plan', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    await connectDB();
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid plan ID is required' },
        { status: 400 }
      );
    }

    const plan = await Plan.findById(id);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    await PriceHistory.deleteMany({ plan_id: plan._id });
    await Plan.deleteOne({ _id: plan._id });

    return NextResponse.json({ success: true, message: 'Plan deleted' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete plan', message: error.message },
      { status: 500 }
    );
  }
}

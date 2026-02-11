import mongoose from 'mongoose';
import Community from '@/app/models/Community';
import Company from '@/app/models/Company';
import CommunityCompany from '@/app/models/CommunityCompany';
import ProductSegment from '@/app/models/ProductSegment';
import SegmentCompany from '@/app/models/SegmentCompany';

export interface IdentifyResult {
  communityId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  communityName: string;
  companyName: string;
  /** Name to use in scrape/AI prompts (alias if set, else community name). */
  communityNameForScrape: string;
  /** Optional segment label for scrape when segmentId provided. */
  segmentLabelForScrape?: string;
}

/**
 * Resolves community and company by ID or name and returns the name to use
 * for scraping (alias if stored, otherwise canonical community name).
 */
export async function identifyForScrape(params: {
  communityId?: string;
  communityName?: string;
  companyId?: string;
  companyName?: string;
  segmentId?: string;
}): Promise<IdentifyResult | null> {
  const { communityId: cid, communityName: cName, companyId: coid, companyName: coName, segmentId: segId } = params;

  let community = null;
  if (cid && mongoose.Types.ObjectId.isValid(cid)) {
    community = await Community.findById(cid);
  }
  if (!community && cName && String(cName).trim()) {
    const trimmed = String(cName).trim();
    community = await Community.findOne({
      name: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
  }
  if (!community) return null;

  let company = null;
  if (coid && mongoose.Types.ObjectId.isValid(coid)) {
    company = await Company.findById(coid);
  }
  if (!company && coName && String(coName).trim()) {
    const escaped = String(coName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    company = await Company.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
  }
  if (!company) return null;

  const communityObjectId = community._id instanceof mongoose.Types.ObjectId ? community._id : new mongoose.Types.ObjectId(String(community._id));
  const companyObjectId = company._id instanceof mongoose.Types.ObjectId ? company._id : new mongoose.Types.ObjectId(String(company._id));

  const link = await CommunityCompany.findOne({
    communityId: communityObjectId,
    companyId: companyObjectId,
  });
  const communityNameForScrape =
    link?.nameUsedByCompany?.trim() || community.name || '';

  let segmentLabelForScrape: string | undefined;
  if (segId && mongoose.Types.ObjectId.isValid(segId)) {
    const segment = await ProductSegment.findById(segId);
    if (segment) {
      const segCompany = await SegmentCompany.findOne({
        segmentId: segment._id,
        companyId: companyObjectId,
      });
      segmentLabelForScrape =
        (segCompany as any)?.segmentLabelAsCompany?.trim() || segment.label;
    }
  }

  return {
    communityId: communityObjectId,
    companyId: companyObjectId,
    communityName: community.name,
    companyName: company.name,
    communityNameForScrape,
    segmentLabelForScrape,
  };
}

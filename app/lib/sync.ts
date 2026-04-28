import mongoose from 'mongoose';
import connectDB from './mongodb';
import Community from '../models/Community';
import Company from '../models/Company';
import { runScrapeJob, type ScrapeJobResult } from '../api/scrape/route';

/**
 * If a sync started more than this long ago without completing, treat the lock as stale
 * (the previous run probably crashed or the serverless invocation was killed mid-flight).
 */
const STALE_LOCK_MS = 60 * 60 * 1000;

export interface CompanySyncResult {
  companyId: string;
  companyName: string;
  ok: boolean;
  /** Per-company scrape summary when the run succeeded. */
  result?: ScrapeJobResult;
  /** Error message when the run failed. */
  error?: string;
}

export interface CommunitySyncResult {
  communityId: string;
  communityName: string;
  /** True if the community was actually synced (false = skipped due to active lock). */
  ran: boolean;
  /** Reason for skipping when ran === false. */
  skipReason?: string;
  companies: CompanySyncResult[];
  /** Total plans saved across all companies in this community. */
  totalSaved: number;
  /** Total per-plan errors across all companies. */
  totalErrors: number;
}

interface SyncCommunityOptions {
  /** When true, skip the in-progress lock check (for manual re-runs of stuck syncs). */
  force?: boolean;
}

/**
 * Sync every company assigned to a single community: for each company, delete its
 * existing plans for this community and re-scrape via runScrapeJob. Tracks status
 * via Community.lastSyncStartedAt / lastSyncCompletedAt / lastSyncError.
 *
 * Companies are synced serially to keep OpenAI rate-limit pressure predictable.
 * One company failing does not abort the rest of the community.
 */
export async function syncCommunity(
  communityId: string,
  options: SyncCommunityOptions = {}
): Promise<CommunitySyncResult> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(communityId)) {
    throw new Error(`Invalid communityId: ${communityId}`);
  }

  const community = await Community.findById(communityId).populate('companies', 'name');
  if (!community) {
    throw new Error(`Community not found: ${communityId}`);
  }

  // Lock check: refuse if another sync is in progress (unless caller forces).
  const startedAt = community.lastSyncStartedAt as Date | null | undefined;
  const completedAt = community.lastSyncCompletedAt as Date | null | undefined;
  const isLocked =
    startedAt &&
    (!completedAt || startedAt.getTime() > completedAt.getTime()) &&
    Date.now() - startedAt.getTime() < STALE_LOCK_MS;

  if (isLocked && !options.force) {
    return {
      communityId: String(community._id),
      communityName: community.name,
      ran: false,
      skipReason: `Another sync started at ${startedAt!.toISOString()} is still in progress`,
      companies: [],
      totalSaved: 0,
      totalErrors: 0,
    };
  }

  community.lastSyncStartedAt = new Date();
  community.lastSyncError = null;
  await community.save();

  const companyResults: CompanySyncResult[] = [];
  let totalSaved = 0;
  let totalErrors = 0;
  const failedCompanyNames: string[] = [];

  try {
    const companies = (community.companies as unknown as Array<{ _id: mongoose.Types.ObjectId; name?: string } | mongoose.Types.ObjectId>) || [];

    for (const c of companies) {
      // companies array may be either populated docs or raw ObjectIds depending on prior state
      const companyId = (c as { _id?: mongoose.Types.ObjectId })._id ?? (c as mongoose.Types.ObjectId);
      const companyName =
        (c as { name?: string }).name ??
        (await Company.findById(companyId).select('name').lean().then((d) => (d as { name?: string } | null)?.name)) ??
        '';

      if (!companyName) {
        companyResults.push({
          companyId: String(companyId),
          companyName: '',
          ok: false,
          error: 'Company has no name',
        });
        continue;
      }

      try {
        const result = await runScrapeJob({
          company: companyName,
          community: community.name,
        });
        const { savedPlans: _ignored, ...summary } = result;
        totalSaved += summary.saved;
        totalErrors += summary.errors;
        companyResults.push({
          companyId: String(companyId),
          companyName,
          ok: true,
          result: summary,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failedCompanyNames.push(companyName);
        companyResults.push({
          companyId: String(companyId),
          companyName,
          ok: false,
          error: message,
        });
      }
    }

    community.lastSyncCompletedAt = new Date();
    community.lastSyncError = failedCompanyNames.length
      ? `Failed for: ${failedCompanyNames.join(', ')}`
      : null;
    await community.save();

    return {
      communityId: String(community._id),
      communityName: community.name,
      ran: true,
      companies: companyResults,
      totalSaved,
      totalErrors,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    community.lastSyncCompletedAt = new Date();
    community.lastSyncError = message;
    await community.save();
    throw err;
  }
}

export interface SyncAllOptions {
  /** Include competitor/side communities. Default: false. */
  includeCompetitors?: boolean;
  /** Include subcommunities (children). Default: true. */
  includeSubcommunities?: boolean;
}

/**
 * Sync every community that has at least one company assigned. Communities are
 * processed serially to limit concurrent OpenAI calls.
 */
export async function syncAllCommunities(
  options: SyncAllOptions = {}
): Promise<{
  totalCommunities: number;
  ranCount: number;
  skippedCount: number;
  totalSaved: number;
  totalErrors: number;
  results: CommunitySyncResult[];
}> {
  await connectDB();

  const filter: Record<string, unknown> = {
    companies: { $exists: true, $not: { $size: 0 } },
  };
  if (!options.includeCompetitors) {
    filter.communityType = { $ne: 'competitor' };
  }
  if (options.includeSubcommunities === false) {
    filter.parentCommunityId = null;
  }

  const communities = await Community.find(filter).select('_id name').lean();
  const results: CommunitySyncResult[] = [];
  let ranCount = 0;
  let skippedCount = 0;
  let totalSaved = 0;
  let totalErrors = 0;

  for (const c of communities as unknown as Array<{ _id: mongoose.Types.ObjectId; name: string }>) {
    try {
      const result = await syncCommunity(String(c._id));
      results.push(result);
      if (result.ran) ranCount += 1;
      else skippedCount += 1;
      totalSaved += result.totalSaved;
      totalErrors += result.totalErrors;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        communityId: String(c._id),
        communityName: c.name,
        ran: false,
        skipReason: message,
        companies: [],
        totalSaved: 0,
        totalErrors: 0,
      });
      skippedCount += 1;
    }
  }

  return {
    totalCommunities: communities.length,
    ranCount,
    skippedCount,
    totalSaved,
    totalErrors,
    results,
  };
}

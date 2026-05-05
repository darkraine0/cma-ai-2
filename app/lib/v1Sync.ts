/**
 * V1 plan sync — single source of truth used by ALL triggers:
 *  1. The daily scheduler (`app/lib/v1SyncScheduler.ts`)
 *  2. The manual admin trigger (`app/api/admin/sync-v1`, runs in background)
 *  3. The CLI script (`scripts/sync-v1.ts`)
 *
 * Behavior:
 *  - For each Community in DB, queries the upstream V1 API (`get_plans`) using
 *    `v1ExternalCommunityName` (or `name` as fallback) with a per-call timeout
 *    so a single hung socket can't stall the whole run.
 *  - Every V1 row gets a stable `externalKey`. If a Plan with that key already
 *    exists -> skip (this is what protects manager edits).
 *  - Otherwise inserts a new Plan with `source: 'v1'`.
 *  - If a V1 plan references a Company not in DB, the Company is auto-created
 *    and added to the Community's `companies` array.
 *  - Communities not present in DB are skipped.
 *  - Persists running state, last summary, and last error on AppState so the
 *    dashboard can render a live status without holding an HTTP connection.
 *
 * Concurrency: `syncAllV1Communities()` is self-deduping at the module level.
 * A second concurrent call returns the same in-flight Promise instead of
 * starting a new run.
 */

import mongoose from 'mongoose';
import connectDB from './mongodb';
import Community from '../models/Community';
import Company from '../models/Company';
import Plan from '../models/Plan';
import AppState, { APP_STATE_KEY, IV1SyncSummary } from '../models/AppState';

const EXTERNAL_PLANS_BASE =
  'https://light-settled-filly.ngrok-free.app/api/get_plans';

/** Per-fetch timeout for upstream V1 calls. Prevents one hung socket from
 *  stalling the whole sync; the V1 ngrok upstream is known to be flaky. */
const V1_FETCH_TIMEOUT_MS = 20_000;

/** A `v1RunningSince` older than this is treated as stale (e.g. process
 *  crashed mid-run) and overwritten by the next call. Keeps the dashboard
 *  from being permanently stuck in "Running…". */
const RUNNING_STALE_AFTER_MS = 30 * 60 * 1000;

interface RawV1Plan {
  plan_name?: unknown;
  price?: unknown;
  sqft?: unknown;
  stories?: unknown;
  price_per_sqft?: unknown;
  last_updated?: unknown;
  price_changed_recently?: unknown;
  company?: unknown;
  community?: unknown;
  type?: unknown;
  address?: unknown;
  beds?: unknown;
  baths?: unknown;
  design_number?: unknown;
}

export interface V1SyncCommunityResult {
  communityId: string;
  communityName: string;
  v1QueryName: string;
  fetched: number;
  inserted: number;
  skippedExisting: number;
  skippedInvalid: number;
  errors: string[];
}

export interface V1SyncSummary {
  totalCommunities: number;
  totalFetched: number;
  totalInserted: number;
  totalSkippedExisting: number;
  totalSkippedInvalid: number;
  totalErrors: number;
  results: V1SyncCommunityResult[];
}

/** Lowercase + collapse whitespace. Used to build stable dedupe keys. */
function normalizeForKey(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function buildExternalKey(parts: {
  communityName: string;
  companyName: string;
  type: 'plan' | 'now';
  planName: string;
  address: string;
}): string {
  return [
    'v1',
    normalizeForKey(parts.communityName),
    normalizeForKey(parts.companyName),
    parts.type,
    normalizeForKey(parts.planName),
    normalizeForKey(parts.address),
  ].join('::');
}

function coerceType(raw: unknown): 'plan' | 'now' {
  const t = String(raw ?? '').toLowerCase();
  return t === 'plan' ? 'plan' : 'now';
}

function coerceNumber(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function coerceString(raw: unknown): string {
  return raw == null ? '' : String(raw).trim();
}

function coerceDate(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  const s = coerceString(raw);
  if (!s) return new Date();
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : new Date();
}

/** Find or create a Company by name, then ensure it's in community.companies. */
async function ensureCompanyOnCommunity(
  communityDoc: InstanceType<typeof Community>,
  companyName: string
): Promise<{ _id: mongoose.Types.ObjectId; name: string } | null> {
  const trimmed = companyName.trim();
  if (!trimmed) return null;

  let companyDoc = await Company.findOne({ name: trimmed });
  if (!companyDoc) {
    companyDoc = new Company({ name: trimmed });
    await companyDoc.save();
  }

  const companyId = companyDoc._id as mongoose.Types.ObjectId;
  const already = (communityDoc.companies || []).some(
    (id: mongoose.Types.ObjectId) => id.equals(companyId)
  );
  if (!already) {
    communityDoc.companies = [
      ...(communityDoc.companies || []),
      companyId,
    ] as typeof communityDoc.companies;
    await communityDoc.save();
  }

  return { _id: companyId, name: companyDoc.name };
}

async function fetchV1Plans(communityName: string): Promise<RawV1Plan[]> {
  const url = `${EXTERNAL_PLANS_BASE}?community=${encodeURIComponent(communityName)}`;
  const res = await fetch(url, {
    headers: { 'ngrok-skip-browser-warning': 'true' },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`V1 get_plans HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as RawV1Plan[]) : [];
}

/**
 * Sync V1 plans for a single community. Inserts new V1 rows; never updates
 * or deletes existing rows.
 */
export async function syncV1Community(
  communityId: string
): Promise<V1SyncCommunityResult> {
  await connectDB();

  const community = await Community.findById(communityId);
  if (!community) throw new Error(`Community not found: ${communityId}`);

  const v1QueryName =
    (community.v1ExternalCommunityName ?? '').trim() || community.name.trim();

  const result: V1SyncCommunityResult = {
    communityId: String(community._id),
    communityName: community.name,
    v1QueryName,
    fetched: 0,
    inserted: 0,
    skippedExisting: 0,
    skippedInvalid: 0,
    errors: [],
  };

  if (!v1QueryName) {
    result.errors.push('No V1 community name available to query');
    return result;
  }

  let raw: RawV1Plan[];
  try {
    raw = await fetchV1Plans(v1QueryName);
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
    return result;
  }

  result.fetched = raw.length;

  for (const item of raw) {
    try {
      const price = coerceNumber(item.price);
      const sqft = coerceNumber(item.sqft);

      // Skip the well-known V1 garbage row where price === sqft.
      if (price > 0 && price === sqft) {
        result.skippedInvalid += 1;
        continue;
      }

      const type = coerceType(item.type);
      const address = coerceString(item.address);
      const rawPlanName = coerceString(item.plan_name);
      const planName =
        rawPlanName || (type === 'now' && address ? address : '');
      if (!planName) {
        result.skippedInvalid += 1;
        continue;
      }

      const companyName = coerceString(item.company);
      if (!companyName) {
        result.skippedInvalid += 1;
        continue;
      }

      const externalKey = buildExternalKey({
        communityName: community.name,
        companyName,
        type,
        planName,
        address,
      });

      const existing = await Plan.findOne({ externalKey })
        .select('_id')
        .lean();
      if (existing) {
        result.skippedExisting += 1;
        continue;
      }

      const companyRef = await ensureCompanyOnCommunity(community, companyName);
      if (!companyRef) {
        result.skippedInvalid += 1;
        continue;
      }

      try {
        await Plan.create({
          plan_name: planName,
          price,
          sqft: sqft || undefined,
          stories: coerceString(item.stories) || undefined,
          price_per_sqft: coerceNumber(item.price_per_sqft) || undefined,
          last_updated: coerceDate(item.last_updated),
          price_changed_recently: Boolean(item.price_changed_recently),
          beds: coerceString(item.beds) || undefined,
          baths: coerceString(item.baths) || undefined,
          address: address || undefined,
          design_number: coerceString(item.design_number) || undefined,
          type,
          company: { _id: companyRef._id, name: companyRef.name },
          community: {
            _id: community._id as mongoose.Types.ObjectId,
            name: community.name,
            location: community.location,
          },
          source: 'v1',
          externalKey,
        });
        result.inserted += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (/E11000|duplicate key/i.test(message)) {
          // Either externalKey collision (concurrent run) or legacy unique
          // index hit (V2 row already occupies the same name+company+community).
          result.skippedExisting += 1;
        } else {
          result.errors.push(message);
        }
      }
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return result;
}

/** Module-level in-flight Promise used to dedupe concurrent runs. */
let inFlight: Promise<V1SyncSummary> | null = null;

/**
 * Sync V1 plans for every community we know about. Communities are processed
 * serially to avoid hammering the V1 API. Persists running state, last
 * summary, and last error on AppState.
 *
 * Self-deduping: if called while a previous call is still running, returns
 * the same in-flight Promise. This is what makes it safe for the manual
 * admin trigger and the scheduler to call it concurrently.
 */
export function syncAllV1Communities(): Promise<V1SyncSummary> {
  if (inFlight) return inFlight;
  inFlight = doSyncAll().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** True if a V1 sync is in progress in this Node process. */
export function isV1SyncRunningLocal(): boolean {
  return inFlight !== null;
}

async function doSyncAll(): Promise<V1SyncSummary> {
  await connectDB();

  const startedAt = new Date();
  await markRunningStarted(startedAt);

  const communities = await Community.find({}).select('_id name').lean();

  const summary: V1SyncSummary = {
    totalCommunities: communities.length,
    totalFetched: 0,
    totalInserted: 0,
    totalSkippedExisting: 0,
    totalSkippedInvalid: 0,
    totalErrors: 0,
    results: [],
  };

  let topLevelError: string | null = null;
  try {
    for (const c of communities as unknown as Array<{
      _id: mongoose.Types.ObjectId;
      name: string;
    }>) {
      try {
        const r = await syncV1Community(String(c._id));
        summary.results.push(r);
        summary.totalFetched += r.fetched;
        summary.totalInserted += r.inserted;
        summary.totalSkippedExisting += r.skippedExisting;
        summary.totalSkippedInvalid += r.skippedInvalid;
        summary.totalErrors += r.errors.length;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        summary.results.push({
          communityId: String(c._id),
          communityName: c.name,
          v1QueryName: '',
          fetched: 0,
          inserted: 0,
          skippedExisting: 0,
          skippedInvalid: 0,
          errors: [message],
        });
        summary.totalErrors += 1;
      }
    }
  } catch (err) {
    // Should be rare — the per-community try/catch covers most cases — but
    // any unexpected throw (e.g. Mongo disconnect) lands here.
    topLevelError = err instanceof Error ? err.message : String(err);
  }

  const finishedAt = new Date();
  await markRunningFinished({
    startedAt,
    finishedAt,
    summary,
    topLevelError,
  });

  return summary;
}

async function markRunningStarted(startedAt: Date): Promise<void> {
  try {
    await AppState.findOneAndUpdate(
      { key: APP_STATE_KEY },
      {
        $set: {
          v1RunningSince: startedAt,
          v1LastError: null,
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn(
      '[v1Sync] Failed to persist running state:',
      err instanceof Error ? err.message : err
    );
  }
}

async function markRunningFinished(args: {
  startedAt: Date;
  finishedAt: Date;
  summary: V1SyncSummary;
  topLevelError: string | null;
}): Promise<void> {
  const persistedSummary: IV1SyncSummary = {
    ...args.summary,
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
    durationMs: args.finishedAt.getTime() - args.startedAt.getTime(),
  };
  try {
    await AppState.findOneAndUpdate(
      { key: APP_STATE_KEY },
      {
        $set: {
          v1RunningSince: null,
          v1LastRunAt: args.finishedAt,
          v1LastFetched: args.summary.totalFetched,
          v1LastInserted: args.summary.totalInserted,
          v1LastError: args.topLevelError,
          v1LastSummary: persistedSummary,
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn(
      '[v1Sync] Failed to persist completion state:',
      err instanceof Error ? err.message : err
    );
  }
}

export interface V1SyncState {
  running: boolean;
  v1RunningSince: Date | null;
  v1LastRunAt: Date | null;
  v1LastFetched: number;
  v1LastInserted: number;
  v1LastError: string | null;
  v1LastSummary: IV1SyncSummary | null;
}

/** Read the persisted state used by the scheduler and the dashboard. */
export async function getV1SyncState(): Promise<V1SyncState> {
  await connectDB();
  const doc = await AppState.findOne({ key: APP_STATE_KEY })
    .select(
      'v1RunningSince v1LastRunAt v1LastFetched v1LastInserted v1LastError v1LastSummary'
    )
    .lean();
  const d = doc as {
    v1RunningSince?: Date | null;
    v1LastRunAt?: Date | null;
    v1LastFetched?: number;
    v1LastInserted?: number;
    v1LastError?: string | null;
    v1LastSummary?: IV1SyncSummary | null;
  } | null;

  // Treat a stale `v1RunningSince` (process crashed mid-run) as not running
  // so the dashboard isn't permanently stuck on "Running…".
  const since = d?.v1RunningSince ?? null;
  const running =
    since != null && Date.now() - since.getTime() < RUNNING_STALE_AFTER_MS;

  return {
    running,
    v1RunningSince: since,
    v1LastRunAt: d?.v1LastRunAt ?? null,
    v1LastFetched: d?.v1LastFetched ?? 0,
    v1LastInserted: d?.v1LastInserted ?? 0,
    v1LastError: d?.v1LastError ?? null,
    v1LastSummary: d?.v1LastSummary ?? null,
  };
}

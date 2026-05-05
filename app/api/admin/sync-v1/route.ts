import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/admin';
import { syncAllV1Communities, getV1SyncState } from '@/app/lib/v1Sync';

/**
 * Manual V1 plan sync — Method 2 (admin-triggered).
 *
 *  - GET  /api/admin/sync-v1   -> returns last-run state for the dashboard
 *  - POST /api/admin/sync-v1   -> runs a full V1 sync and returns the summary
 *
 * Both verbs are admin-only (validated against the database, not just the
 * token). The POST path can be slow (one HTTP call per community) so the
 * route runs on the Node runtime with a long maxDuration.
 */

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/** Concurrency guard: prevents two admin clicks from running the sync twice. */
let manualRunInFlight = false;

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const state = await getV1SyncState();
    return NextResponse.json({
      v1LastRunAt: state.v1LastRunAt,
      v1LastFetched: state.v1LastFetched,
      v1LastInserted: state.v1LastInserted,
      running: manualRunInFlight,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Failed to read V1 sync state',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  if (manualRunInFlight) {
    return NextResponse.json(
      { error: 'A V1 sync is already in progress. Please wait.' },
      { status: 409 }
    );
  }

  manualRunInFlight = true;
  const startedAt = new Date();
  try {
    const summary = await syncAllV1Communities();
    const finishedAt = new Date();
    return NextResponse.json({
      success: true,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      ...summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        startedAt: startedAt.toISOString(),
        error: message,
      },
      { status: 500 }
    );
  } finally {
    manualRunInFlight = false;
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/admin';
import { syncAllV1Communities, getV1SyncState, isV1SyncRunningLocal} from '@/app/lib/v1Sync';

/**
 * Manual V1 plan sync — Method 2 (admin-triggered).
 *
 *   GET  /api/admin/sync-v1  -> returns running flag + last-run state
 *   POST /api/admin/sync-v1  -> kicks off a sync IN THE BACKGROUND and
 *                               returns 202 Accepted immediately
 *
 * Why background?
 *   A full V1 sync iterates ~60 communities and can take 30-90 seconds. Doing
 *   it inside the HTTP request lifecycle is fragile: any HMR reload, browser
 *   timeout, or upstream socket close turns the response body into a non-JSON
 *   error page (the symptom that motivated this design). Decoupling the sync
 *   from the request also means the dashboard can survive a refresh mid-run
 *   without losing visibility — it just polls GET.
 *
 * Both verbs are admin-only (validated against the database, not just the
 * token).
 */

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const state = await getV1SyncState();
    return NextResponse.json({
      running: state.running || isV1SyncRunningLocal(),
      v1RunningSince: state.v1RunningSince,
      v1LastRunAt: state.v1LastRunAt,
      v1LastFetched: state.v1LastFetched,
      v1LastInserted: state.v1LastInserted,
      v1LastError: state.v1LastError,
      v1LastSummary: state.v1LastSummary,
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

  try {
    const state = await getV1SyncState();
    if (state.running || isV1SyncRunningLocal()) {
      return NextResponse.json(
        {
          accepted: false,
          running: true,
          message: 'A V1 sync is already in progress.',
          v1RunningSince: state.v1RunningSince,
        },
        { status: 409 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      {
        accepted: false,
        error: 'Failed to read V1 sync state',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }

  // Kick off the sync in the background. We deliberately do NOT await it.
  // syncAllV1Communities is self-deduping and persists its own state to
  // AppState, so the GET endpoint can report progress and final results.
  // Errors are swallowed here because they're already persisted on AppState
  // as v1LastError; this also prevents an unhandled-rejection warning.
  void syncAllV1Communities().catch((err) => {
    console.error(
      '[admin/sync-v1] Background sync failed:',
      err instanceof Error ? err.message : err
    );
  });

  return NextResponse.json(
    {
      accepted: true,
      running: true,
      startedAt: new Date().toISOString(),
      message:
        'V1 sync started. Poll GET /api/admin/sync-v1 for progress.',
    },
    { status: 202 }
  );
}

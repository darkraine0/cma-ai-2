import { NextRequest, NextResponse } from 'next/server';
import { syncAllCommunities } from '@/app/lib/sync';

/**
 * Daily cron entry point. Triggers a full sync of every (non-competitor) community
 * with at least one company assigned. Communities and per-community companies are
 * processed serially to keep OpenAI rate-limit pressure predictable.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}`. Vercel Cron attaches this
 * header automatically when CRON_SECRET is set in the project's env vars. External
 * triggers (system cron, GitHub Actions) must send the same header.
 */

// Force Node.js runtime (mongoose isn't supported on the edge runtime).
export const runtime = 'nodejs';
// Pro plan caps cron functions at 300s; Hobby at 60s. Set to the higher bound; if
// the run exceeds the host's actual cap it will time out, and the per-community
// lastSyncStartedAt lock keeps state from corrupting on restart.
export const maxDuration = 300;
// Never cache.
export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Fail closed: refuse to run if no secret is configured.
    return false;
  }
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  return header === `Bearer ${expected}`;
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on the server' },
      { status: 500 }
    );
  }

  const startedAt = new Date();
  try {
    const summary = await syncAllCommunities();
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
  }
}

// Vercel Cron triggers via GET. Allow POST too so external triggers (curl, GitHub
// Actions) can use either verb.
export const GET = handle;
export const POST = handle;

/**
 * In-process V1 sync scheduler — Method 1 (daily automatic).
 *
 * Reads the persisted `v1LastRunAt` on boot and schedules a single setTimeout
 * for the next run. After each tick, the next tick is rescheduled relative
 * to the actual elapsed time, so a manual admin run shifts the schedule
 * automatically (the scheduler doesn't double-run on top of a manual run).
 *
 * Configuration:
 *   V1_SYNC_INTERVAL_HOURS  – cadence in hours (default 24)
 *   V1_SYNC_AUTO_DISABLED   – set to "1" to opt out (e.g. CI, tests)
 *
 * Notes:
 *  - Only runs in the `nodejs` runtime (Mongoose isn't supported on edge).
 *  - Idempotent: a globalThis guard means dev hot reloads don't spawn dupes.
 *  - Requires a long-running Node process. Will NOT work on Vercel
 *    Serverless Functions; for that deployment shape, expose a cron route.
 */

import { syncAllV1Communities, getV1SyncState } from './v1Sync';

const HOUR_MS = 60 * 60 * 1000;
const STARTUP_DELAY_MS = 30 * 1000; // small buffer so first run doesn't fight server boot

interface SchedulerState {
  timeout: ReturnType<typeof setTimeout> | null;
  running: boolean;
  started: boolean;
}

function getState(): SchedulerState {
  const g = globalThis as unknown as { __v1SyncScheduler?: SchedulerState };
  if (!g.__v1SyncScheduler) {
    g.__v1SyncScheduler = { timeout: null, running: false, started: false };
  }
  return g.__v1SyncScheduler;
}

function getIntervalMs(): number {
  const raw = process.env.V1_SYNC_INTERVAL_HOURS;
  const hours = raw ? Number(raw) : 24;
  if (!Number.isFinite(hours) || hours <= 0) return 24 * HOUR_MS;
  return hours * HOUR_MS;
}

async function runOnce(): Promise<void> {
  const state = getState();
  if (state.running) {
    console.log('[v1Sync/scheduler] Skipping — previous run still in progress');
    return;
  }
  state.running = true;
  const start = Date.now();
  console.log('[v1Sync/scheduler] Starting scheduled run');
  try {
    const summary = await syncAllV1Communities();
    console.log('[v1Sync/scheduler] Run complete:', {
      durationMs: Date.now() - start,
      totalCommunities: summary.totalCommunities,
      totalFetched: summary.totalFetched,
      totalInserted: summary.totalInserted,
      totalSkippedExisting: summary.totalSkippedExisting,
      totalSkippedInvalid: summary.totalSkippedInvalid,
      totalErrors: summary.totalErrors,
    });
  } catch (err) {
    console.error(
      '[v1Sync/scheduler] Run failed:',
      err instanceof Error ? err.message : err
    );
  } finally {
    state.running = false;
  }
}

function scheduleTick(delayMs: number): void {
  const state = getState();
  if (state.timeout) clearTimeout(state.timeout);

  const ms = Math.max(0, Math.round(delayMs));
  console.log(
    `[v1Sync/scheduler] Next tick in ${Math.round(ms / 1000)}s ` +
      `(~${(ms / HOUR_MS).toFixed(2)}h)`
  );

  state.timeout = setTimeout(async () => {
    state.timeout = null;
    const intervalMs = getIntervalMs();

    try {
      // Re-check persisted state. If a manual admin trigger ran the sync
      // recently, defer this tick instead of double-running.
      const { v1LastRunAt } = await getV1SyncState();
      const elapsed = v1LastRunAt
        ? Date.now() - v1LastRunAt.getTime()
        : Infinity;

      if (elapsed < intervalMs) {
        scheduleTick(intervalMs - elapsed);
        return;
      }

      await runOnce();
    } catch (err) {
      console.error(
        '[v1Sync/scheduler] Tick error:',
        err instanceof Error ? err.message : err
      );
    } finally {
      // Always reschedule, even on error, so a single failure can't strand
      // the scheduler. The persisted timestamp keeps cadence honest.
      scheduleTick(getIntervalMs());
    }
  }, ms);
}

/**
 * Start the V1 sync scheduler. Idempotent — subsequent calls are no-ops.
 * Should be invoked once at server startup (see instrumentation.ts).
 */
export async function startV1SyncScheduler(): Promise<void> {
  if (process.env.V1_SYNC_AUTO_DISABLED === '1') {
    console.log(
      '[v1Sync/scheduler] Disabled via V1_SYNC_AUTO_DISABLED=1'
    );
    return;
  }

  const state = getState();
  if (state.started || state.timeout) return;
  state.started = true;

  const intervalMs = getIntervalMs();
  console.log(
    `[v1Sync/scheduler] Starting; interval = ${(intervalMs / HOUR_MS).toFixed(2)}h`
  );

  try {
    const { v1LastRunAt } = await getV1SyncState();
    if (!v1LastRunAt) {
      // First-ever run on this DB: kick off shortly after boot.
      scheduleTick(STARTUP_DELAY_MS);
      return;
    }
    const elapsed = Date.now() - v1LastRunAt.getTime();
    if (elapsed >= intervalMs) {
      // Overdue: run after a small startup delay.
      scheduleTick(STARTUP_DELAY_MS);
    } else {
      scheduleTick(intervalMs - elapsed);
    }
  } catch (err) {
    console.error(
      '[v1Sync/scheduler] Failed to read state; scheduling fresh start:',
      err instanceof Error ? err.message : err
    );
    scheduleTick(STARTUP_DELAY_MS);
  }
}

/** Stop the scheduler. Used in tests; safe to call when not started. */
export function stopV1SyncScheduler(): void {
  const state = getState();
  if (state.timeout) {
    clearTimeout(state.timeout);
    state.timeout = null;
  }
  state.started = false;
  console.log('[v1Sync/scheduler] Stopped');
}

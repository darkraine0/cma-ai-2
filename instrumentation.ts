/**
 * Next.js instrumentation hook.
 *
 * Runs once on server startup (and once per dev hot-reload server restart).
 * Used here to start the in-process V1 sync scheduler so no external cron
 * service is required.
 *
 * Notes:
 *  - Guarded by `NEXT_RUNTIME === 'nodejs'` so it never runs on the edge
 *    runtime (Mongoose isn't supported there).
 *  - The scheduler itself is idempotent via a globalThis singleton, so even
 *    if register() is invoked more than once across hot reloads, only one
 *    timer is active.
 *  - Set `V1_SYNC_AUTO_DISABLED=1` in env to skip auto-start (useful for
 *    tests, CI, or local dev sessions where you don't want to hit upstream).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    const { startV1SyncScheduler } = await import('./app/lib/v1SyncScheduler');
    await startV1SyncScheduler();
  } catch (err) {
    console.error(
      '[instrumentation] Failed to start V1 sync scheduler:',
      err instanceof Error ? err.message : err
    );
  }
}

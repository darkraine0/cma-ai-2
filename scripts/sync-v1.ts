/**
 * One-shot manual V1 sync.
 *
 * Usage:
 *   npm run sync:v1
 *
 * Useful for:
 *  - Initial population of V1 plan data right after deploying this feature.
 *  - Backfilling on a fresh database.
 *  - Triggering a sync from a developer machine without going through the
 *    admin UI / API.
 *
 * The scheduler is auto-disabled for this process so the script doesn't spawn
 * an in-process timer (which would otherwise be killed seconds later anyway).
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseEnvContent(env: string) {
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/
    );
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

async function loadEnv() {
  const root = process.cwd();
  const rootAlt = join(__dirname, '..');
  const names = ['.env', '.env.local', '.env.development', '.env.development.local'];
  for (const name of names) {
    for (const base of [root, rootAlt]) {
      const envPath = join(base, name);
      if (existsSync(envPath)) {
        const env = await readFile(envPath, 'utf-8');
        parseEnvContent(env);
      }
    }
  }
}

async function main() {
  await loadEnv();

  if (!process.env.MONGODB_URI) {
    console.error(
      'MONGODB_URI is not set. Add it to .env in the project root or set it in the environment.'
    );
    process.exit(1);
  }

  // Suppress the in-process scheduler in case anything in the import chain
  // tries to start it. We only want the one-shot sync here.
  process.env.V1_SYNC_AUTO_DISABLED = '1';

  const { syncAllV1Communities } = await import('../app/lib/v1Sync');

  console.log('[sync-v1] Starting full V1 sync…');
  const start = Date.now();
  const summary = await syncAllV1Communities();
  const durationMs = Date.now() - start;

  console.log('[sync-v1] Done in', durationMs, 'ms');
  console.log('  Communities processed:', summary.totalCommunities);
  console.log('  Plans fetched:        ', summary.totalFetched);
  console.log('  Plans inserted:       ', summary.totalInserted);
  console.log('  Skipped (existing):   ', summary.totalSkippedExisting);
  console.log('  Skipped (invalid):    ', summary.totalSkippedInvalid);
  console.log('  Errors:               ', summary.totalErrors);

  if (summary.totalErrors > 0) {
    console.log('\n[sync-v1] Communities with errors:');
    for (const r of summary.results) {
      if (r.errors.length === 0) continue;
      console.log(`  - ${r.communityName}: ${r.errors.join(' | ')}`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[sync-v1] Fatal:', err);
  process.exit(1);
});

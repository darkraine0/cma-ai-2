/**
 * Run pending migrations from scripts/migrations/.
 * Usage: npx tsx scripts/run-migrations.ts
 * Requires: MONGODB_URI in .env (or environment)
 */

import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseEnvContent(env: string) {
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

async function loadEnv() {
  const root = process.cwd();
  const rootAlt = join(__dirname, '..');
  // Load all that exist; later files override (so .env.local wins)
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

const MIGRATIONS_COLLECTION = 'migrations';

async function getDb() {
  const mongoose = await import('mongoose');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    const tried = [join(process.cwd(), '.env'), join(__dirname, '..', '.env')];
    throw new Error(
      'MONGODB_URI is not set. Add MONGODB_URI=... to .env in the project root (e.g. ' +
        process.cwd() +
        ') or set the environment variable. Looked for .env at: ' +
        tried.join(', ')
    );
  }
  const mongooseInstance = mongoose.default;
  if (mongooseInstance.connection.readyState !== 1) {
    await mongooseInstance.connect(uri);
  }
  return mongooseInstance.connection.db!;
}

async function getRunMigrations(db: import('mongodb').Db): Promise<string[]> {
  const col = db.collection(MIGRATIONS_COLLECTION);
  const docs = await col.find({}).project({ id: 1 }).toArray();
  return docs.map((d) => (d as { id: string }).id);
}

async function recordMigration(db: import('mongodb').Db, id: string) {
  await db.collection(MIGRATIONS_COLLECTION).insertOne({
    id,
    runAt: new Date(),
  });
}

async function main() {
  await loadEnv();

  const migrationsDir = join(__dirname, 'migrations');
  const files = await readdir(migrationsDir);
  const migrationFiles = files
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log('No migration files found in scripts/migrations/');
    process.exit(0);
    return;
  }

  const db = await getDb();
  const runIds = await getRunMigrations(db);

  for (const file of migrationFiles) {
    const id = file.replace(/\.ts$/, '');
    if (runIds.includes(id)) {
      console.log('Skip (already run):', id);
      continue;
    }
    console.log('Run:', id);
    const path = join(migrationsDir, file);
    const mod = await import(pathToFileURL(path).href);
    const up = mod.up || mod.default;
    if (typeof up !== 'function') {
      console.error('Migration', id, 'must export up() or default function');
      process.exit(1);
    }
    await up();
    await recordMigration(db, id);
    console.log('Done:', id);
  }

  console.log('Migrations finished.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

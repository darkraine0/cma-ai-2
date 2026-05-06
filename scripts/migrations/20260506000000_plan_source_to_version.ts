/**
 * Migration: Replace `source: 'manual' | 'v1'` with `version: 1 | 2 | 3`
 * on the Plan collection.
 *
 *  - source = 'v1'                        -> version = 1
 *  - source = 'manual' | undefined | null -> version = 2
 *
 *  (version = 3, "V1 modified by user", is set going forward by the PATCH
 *   /api/plans/[id] handler; it is never produced by this backfill.)
 *
 * Index changes:
 *  - Drop unique compound index that includes `source`
 *  - Drop simple index on `source`
 *  - Create unique compound index that includes `version`
 *
 * Field changes:
 *  - `$unset` the `source` field on every Plan document.
 *
 * Idempotent: re-runs are safe because each step tolerates missing
 * indexes / already-migrated documents.
 */

import mongoose from 'mongoose';
import connectDB from '../../app/lib/mongodb';

const PLAN_COLLECTION = 'plans';

const OLD_UNIQUE_INDEX_NAME =
  'plan_name_1_company.name_1_community.name_1_segment.name_1_type_1_source_1';
const NEW_UNIQUE_INDEX_NAME =
  'plan_name_1_company.name_1_community.name_1_segment.name_1_type_1_version_1';
const OLD_SOURCE_SIMPLE_INDEX = 'source_1';
const NEW_VERSION_SIMPLE_INDEX = 'version_1';

export async function up() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error('Mongo connection not ready');

  const plans = db.collection(PLAN_COLLECTION);

  // 1. Backfill `version` from `source`. Order matters: do v1 first, then
  //    sweep everything that's still missing `version` to 2.
  const v1Result = await plans.updateMany(
    { source: 'v1' },
    { $set: { version: 1 } }
  );
  console.log(`Set version=1 on ${v1Result.modifiedCount} V1 plans.`);

  const manualResult = await plans.updateMany(
    { version: { $exists: false } },
    { $set: { version: 2 } }
  );
  console.log(`Set version=2 on ${manualResult.modifiedCount} other plans.`);

  // 2. Drop the legacy unique compound index that included `source`.
  try {
    await plans.dropIndex(OLD_UNIQUE_INDEX_NAME);
    console.log('Dropped legacy unique compound index:', OLD_UNIQUE_INDEX_NAME);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/index not found|ns not found/i.test(msg)) {
      console.log('Legacy unique compound index already absent.');
    } else {
      throw err;
    }
  }

  // 3. Drop the legacy simple index on `source`.
  try {
    await plans.dropIndex(OLD_SOURCE_SIMPLE_INDEX);
    console.log('Dropped legacy simple index:', OLD_SOURCE_SIMPLE_INDEX);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/index not found|ns not found/i.test(msg)) {
      console.log('Legacy simple `source` index already absent.');
    } else {
      throw err;
    }
  }

  // 4. Now that nothing depends on `source`, drop it from every document.
  const unsetResult = await plans.updateMany(
    { source: { $exists: true } },
    { $unset: { source: '' } }
  );
  console.log(`Removed legacy \`source\` field from ${unsetResult.modifiedCount} plans.`);

  // 5. Create the new unique compound index that includes `version`.
  try {
    await plans.createIndex(
      {
        plan_name: 1,
        'company.name': 1,
        'community.name': 1,
        'segment.name': 1,
        type: 1,
        version: 1,
      },
      { unique: true, name: NEW_UNIQUE_INDEX_NAME }
    );
    console.log('Ensured new unique compound index (with version).');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg)) {
      console.log('New unique compound index already present.');
    } else {
      throw err;
    }
  }

  // 6. Create simple index on `version` (mirrors `index: true` in schema).
  try {
    await plans.createIndex(
      { version: 1 },
      { name: NEW_VERSION_SIMPLE_INDEX }
    );
    console.log('Ensured simple `version` index.');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg)) {
      console.log('Simple `version` index already present.');
    } else {
      throw err;
    }
  }
}

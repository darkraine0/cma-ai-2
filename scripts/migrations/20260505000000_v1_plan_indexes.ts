/**
 * Migration: Update Plan indexes for V1 sync support.
 *
 *  1. Drop the legacy compound unique index that didn't include `source`.
 *     (`plan_name + company.name + community.name + segment.name + type`)
 *  2. Create the new compound unique index that includes `source` so V1 and
 *     V2 plans with the same identifying fields can coexist.
 *  3. Create the sparse-unique index on `externalKey` used to dedupe V1 rows.
 *
 * This migration is idempotent — re-runs are safe because each createIndex
 * call uses the same key/options as Mongoose, and dropIndex tolerates a
 * missing legacy index.
 */

import mongoose from 'mongoose';
import connectDB from '../../app/lib/mongodb';

const PLAN_COLLECTION = 'plans';

// Mongo's auto-generated name for the legacy index.
const LEGACY_UNIQUE_INDEX_NAME =
  'plan_name_1_company.name_1_community.name_1_segment.name_1_type_1';

// Auto-generated names for the replacements (Mongo derives them from keys).
const NEW_COMPOUND_INDEX_NAME =
  'plan_name_1_company.name_1_community.name_1_segment.name_1_type_1_source_1';
const NEW_EXTERNAL_KEY_INDEX_NAME = 'externalKey_1';

export async function up() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error('Mongo connection not ready');

  const plans = db.collection(PLAN_COLLECTION);

  // 1. Drop the legacy unique index (if present).
  try {
    await plans.dropIndex(LEGACY_UNIQUE_INDEX_NAME);
    console.log('Dropped legacy index:', LEGACY_UNIQUE_INDEX_NAME);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/index not found|ns not found/i.test(msg)) {
      console.log('Legacy index already absent — skipping drop.');
    } else {
      throw err;
    }
  }

  // 2. Sparse-unique externalKey index.
  try {
    await plans.createIndex(
      { externalKey: 1 },
      { unique: true, sparse: true, name: NEW_EXTERNAL_KEY_INDEX_NAME }
    );
    console.log('Ensured externalKey sparse-unique index.');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg)) {
      console.log('externalKey index already present.');
    } else {
      throw err;
    }
  }

  // 3. New compound unique index that includes `source`.
  try {
    await plans.createIndex(
      {
        plan_name: 1,
        'company.name': 1,
        'community.name': 1,
        'segment.name': 1,
        type: 1,
        source: 1,
      },
      { unique: true, name: NEW_COMPOUND_INDEX_NAME }
    );
    console.log('Ensured new compound unique index (with source).');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg)) {
      console.log('Compound unique index already present.');
    } else {
      throw err;
    }
  }
}

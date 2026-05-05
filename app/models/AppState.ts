import mongoose, { Schema, Document } from 'mongoose';

/**
 * Tiny singleton document for app-level state that doesn't belong on a domain
 * model. Used to coordinate the V1 sync between its triggers (in-process
 * scheduler + manual admin trigger + CLI) and to power the dashboard panel.
 *
 * Always upsert/find with `{ key: APP_STATE_KEY }`.
 */

export const APP_STATE_KEY = 'singleton';

/** Per-community result snapshot persisted on AppState. Mirrors v1Sync.ts. */
export interface IV1SyncCommunityResult {
  communityId: string;
  communityName: string;
  v1QueryName: string;
  fetched: number;
  inserted: number;
  skippedExisting: number;
  skippedInvalid: number;
  errors: string[];
}

export interface IV1SyncSummary {
  totalCommunities: number;
  totalFetched: number;
  totalInserted: number;
  totalSkippedExisting: number;
  totalSkippedInvalid: number;
  totalErrors: number;
  results: IV1SyncCommunityResult[];
  startedAt?: Date;
  finishedAt?: Date;
  durationMs?: number;
}

export interface IAppState extends Document {
  key: string;

  // ---- V1 sync state ----------------------------------------------------

  /** Set when a V1 sync starts; cleared when it ends. Used to derive `running`. */
  v1RunningSince?: Date | null;

  /** Timestamp of the most recent V1 sync completion (success OR failure). */
  v1LastRunAt?: Date | null;

  /** Total plans fetched from upstream on the most recent run. */
  v1LastFetched?: number;

  /** Total plans inserted on the most recent run. */
  v1LastInserted?: number;

  /** Top-level error message from the most recent run (null on success). */
  v1LastError?: string | null;

  /** Full summary of the most recent run for the dashboard. */
  v1LastSummary?: IV1SyncSummary | null;

  createdAt: Date;
  updatedAt: Date;
}

const AppStateSchema = new Schema<IAppState>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: APP_STATE_KEY,
      index: true,
    },
    v1RunningSince: { type: Date, default: null },
    v1LastRunAt: { type: Date, default: null },
    v1LastFetched: { type: Number, default: 0 },
    v1LastInserted: { type: Number, default: 0 },
    v1LastError: { type: String, default: null },
    // Stored as Mixed because the per-community array can be large and is
    // only ever read whole. Mongoose's strict typing isn't useful here.
    v1LastSummary: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.AppState ||
  mongoose.model<IAppState>('AppState', AppStateSchema);

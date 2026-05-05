import mongoose, { Schema, Document } from 'mongoose';

/**
 * Tiny singleton document for app-level state that doesn't belong on a domain
 * model. Currently used to persist the last V1 sync timestamp so the
 * in-process scheduler and manual triggers stay in sync, and so the dashboard
 * can show "last synced X minutes ago".
 *
 * Always upsert/find with `{ key: APP_STATE_KEY }`.
 */

export const APP_STATE_KEY = 'singleton';

export interface IAppState extends Document {
  key: string;
  /** Timestamp of the most recent V1 sync run (any trigger). */
  v1LastRunAt?: Date | null;
  /** Total plans inserted on the most recent run (for quick dashboard display). */
  v1LastInserted?: number;
  /** Total V1 plans fetched from upstream on the most recent run. */
  v1LastFetched?: number;
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
    v1LastRunAt: { type: Date, default: null },
    v1LastInserted: { type: Number, default: 0 },
    v1LastFetched: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.AppState ||
  mongoose.model<IAppState>('AppState', AppStateSchema);

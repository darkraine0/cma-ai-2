import mongoose, { Schema, Document, Types } from 'mongoose';

export type MarketSnapshotStatus =
  | 'uploaded'
  | 'parsed'
  | 'in_review'
  | 'published'
  | 'archived';

export interface IMarketSnapshot extends Document {
  marketCode: string;
  snapshotDate: Date;
  sourceType: 'powerpoint' | 'csv' | 'manual';
  sourceFilename: string;
  sourceFileUrl?: string | null;
  status: MarketSnapshotStatus;
  uploadedBy?: Types.ObjectId;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MarketSnapshotSchema = new Schema<IMarketSnapshot>(
  {
    marketCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    snapshotDate: {
      type: Date,
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ['powerpoint', 'csv', 'manual'],
      required: true,
      default: 'powerpoint',
    },
    sourceFilename: {
      type: String,
      required: true,
      trim: true,
    },
    sourceFileUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['uploaded', 'parsed', 'in_review', 'published', 'archived'],
      default: 'uploaded',
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

MarketSnapshotSchema.index(
  { marketCode: 1, snapshotDate: 1, sourceFilename: 1 },
  { unique: true }
);

export default mongoose.models.MarketSnapshot ||
  mongoose.model<IMarketSnapshot>('MarketSnapshot', MarketSnapshotSchema);

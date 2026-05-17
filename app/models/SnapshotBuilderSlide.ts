import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISnapshotBuilderSlide extends Document {
  marketSnapshotId: Types.ObjectId;
  builderNameRaw: string;
  companyId?: Types.ObjectId | null;
  slideNumber: number;
  slideImageUrl?: string | null;
  extractionStatus: 'pending' | 'matched' | 'needs_review' | 'ignored';
  reviewNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SnapshotBuilderSlideSchema = new Schema<ISnapshotBuilderSlide>(
  {
    marketSnapshotId: {
      type: Schema.Types.ObjectId,
      ref: 'MarketSnapshot',
      required: true,
      index: true,
    },
    builderNameRaw: {
      type: String,
      required: true,
      trim: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },
    slideNumber: {
      type: Number,
      required: true,
    },
    slideImageUrl: {
      type: String,
      default: null,
    },
    extractionStatus: {
      type: String,
      enum: ['pending', 'matched', 'needs_review', 'ignored'],
      default: 'pending',
      index: true,
    },
    reviewNotes: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

SnapshotBuilderSlideSchema.index(
  { marketSnapshotId: 1, slideNumber: 1 },
  { unique: true }
);

export default mongoose.models.SnapshotBuilderSlide ||
  mongoose.model<ISnapshotBuilderSlide>('SnapshotBuilderSlide', SnapshotBuilderSlideSchema);

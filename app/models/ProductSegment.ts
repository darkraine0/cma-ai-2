import mongoose, { Schema, Document, Types } from 'mongoose';

export type SegmentRole = 'primary' | 'competitor' | 'cross_community_comp';

export interface IProductSegment extends Document {
  communityId: Types.ObjectId;        // Parent community
  name: string;                       // Internal name, e.g. "elevon_40s"
  label: string;                      // Display label, e.g. "40' Lots"
  description?: string;               // Optional notes (e.g. "UM selling 30' product on 40' lots")
  isActive: boolean;
  displayOrder?: number;              // For ordering segments within a community
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSegmentSchema = new Schema<IProductSegment>(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure uniqueness of segment name within a community
ProductSegmentSchema.index({ communityId: 1, name: 1 }, { unique: true });

export default mongoose.models.ProductSegment || mongoose.model<IProductSegment>('ProductSegment', ProductSegmentSchema);


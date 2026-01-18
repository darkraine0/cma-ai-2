import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICommunity extends Document {
  name: string;
  slug?: string;
  description?: string;
  location?: string;
  city?: string;
  state?: string;
  companies: Types.ObjectId[]; // Array of company ObjectIds (references)
  totalPlans?: number; // Aggregated stats (denormalized)
  totalQuickMoveIns?: number; // Aggregated stats (denormalized)
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommunitySchema = new Schema<ICommunity>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      trim: true,
      index: true,
    },
    description: {
      type: String,
    },
    location: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    companies: [{
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    }],
    totalPlans: {
      type: Number,
      default: 0,
    },
    totalQuickMoveIns: {
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

export default mongoose.models.Community || mongoose.model<ICommunity>('Community', CommunitySchema);


import mongoose, { Schema, Document, Types } from 'mongoose';

/** 'standard' = UnionMain builds here; 'competitor' = competitor/side community */
export type CommunityType = 'standard' | 'competitor';

/** 'scraped' = homes/plans from scraper; 'manual' = homes added manually */
export type HomesSource = 'scraped' | 'manual';

export interface ICommunity extends Document {
  name: string;
  slug?: string;
  /** standard = UnionMain Homes builds here; competitor = competitor/side community */
  communityType?: CommunityType;
  /** Whether homes/plans for this community are added by scraping or manually */
  homesSource?: HomesSource;
  description?: string;
  location?: string;
  city?: string;
  state?: string;
  /** Data URL (base64) for custom community image (legacy) */
  imageData?: string;
  /** Path to uploaded image file; used for card and for header/banner on community page. */
  imagePath?: string;
  companies: Types.ObjectId[]; // Array of company ObjectIds (references)
  parentCommunityId?: Types.ObjectId; // Reference to parent UnionMain community
  totalPlans?: number; // Aggregated stats (denormalized)
  totalQuickMoveIns?: number; // Aggregated stats (denormalized)
  /** V1 API integration: external community id from get_communities */
  v1ExternalCommunityId?: number;
  /** V1 API integration: external community name (denormalized for display) */
  v1ExternalCommunityName?: string;
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
    communityType: {
      type: String,
      enum: ['standard', 'competitor'],
      default: 'standard',
      index: true,
    },
    homesSource: {
      type: String,
      enum: ['scraped', 'manual'],
      default: 'scraped',
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
    imageData: {
      type: String,
    },
    imagePath: {
      type: String,
    },
    companies: [{
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    }],
    parentCommunityId: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
      index: true,
      default: null,
    },
    totalPlans: {
      type: Number,
      default: 0,
    },
    totalQuickMoveIns: {
      type: Number,
      default: 0,
    },
    v1ExternalCommunityId: {
      type: Number,
      default: null,
    },
    v1ExternalCommunityName: {
      type: String,
      default: null,
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


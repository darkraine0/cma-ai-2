import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Links a company to a community and stores the optional "name this company uses"
 * for this community (e.g. "Elevon at Lavon" vs canonical "Elevon").
 * Used by scrape/identify to pass the right name to AI.
 */
export interface ICommunityCompany extends Document {
  communityId: Types.ObjectId;
  companyId: Types.ObjectId;
  /** Name this company uses when referring to this community (for scrape/AI prompts). */
  nameUsedByCompany?: string;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommunityCompanySchema = new Schema<ICommunityCompany>(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    nameUsedByCompany: {
      type: String,
      trim: true,
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
  { timestamps: true }
);

CommunityCompanySchema.index({ communityId: 1, companyId: 1 }, { unique: true });

export default mongoose.models.CommunityCompany ||
  mongoose.model<ICommunityCompany>('CommunityCompany', CommunityCompanySchema);

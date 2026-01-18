import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  slug?: string;
  description?: string;
  website?: string;
  headquarters?: string;
  founded?: string;
  totalCommunities?: number; // Aggregated stats (denormalized)
  totalPlans?: number; // Aggregated stats (denormalized)
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
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
    website: {
      type: String,
    },
    headquarters: {
      type: String,
    },
    founded: {
      type: String,
    },
    totalCommunities: {
      type: Number,
      default: 0,
    },
    totalPlans: {
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

export default mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);


import mongoose, { Schema, Document, Types } from 'mongoose';

// Embedded company reference
interface ICompanyReference {
  _id: Types.ObjectId;
  name: string;
}

// Embedded community reference
interface ICommunityReference {
  _id: Types.ObjectId;
  name: string;
  location?: string;
}

export interface IPlan extends Document {
  plan_name: string;
  price: number;
  sqft?: number;
  stories?: string;
  price_per_sqft?: number;
  last_updated: Date;
  company: ICompanyReference;
  community: ICommunityReference;
  type: 'plan' | 'now';
  beds?: string;
  baths?: string;
  address?: string;
  design_number?: string;
  price_changed_recently?: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyReferenceSchema = new Schema<ICompanyReference>({
  _id: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
}, { _id: false });

const CommunityReferenceSchema = new Schema<ICommunityReference>({
  _id: {
    type: Schema.Types.ObjectId,
    ref: 'Community',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  location: {
    type: String,
  },
}, { _id: false });

const PlanSchema = new Schema<IPlan>(
  {
    plan_name: {
      type: String,
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
    },
    sqft: {
      type: Number,
    },
    stories: {
      type: String,
    },
    price_per_sqft: {
      type: Number,
    },
    last_updated: {
      type: Date,
      default: Date.now,
    },
    company: {
      type: CompanyReferenceSchema,
      required: true,
    },
    community: {
      type: CommunityReferenceSchema,
      required: true,
    },
    type: {
      type: String,
      enum: ['plan', 'now'],
      required: true,
      default: 'plan',
      index: true,
    },
    beds: {
      type: String,
    },
    baths: {
      type: String,
    },
    address: {
      type: String,
    },
    design_number: {
      type: String,
    },
    price_changed_recently: {
      type: Boolean,
      default: false,
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

// Indexes for efficient queries
PlanSchema.index({ 'company._id': 1, 'community._id': 1, type: 1 });
PlanSchema.index({ 'company.name': 1, type: 1 });
PlanSchema.index({ 'community.name': 1, type: 1 });
PlanSchema.index({ 'community._id': 1, type: 1 });
PlanSchema.index({ price: 1 });
PlanSchema.index({ last_updated: -1 });

// Compound index for uniqueness (using embedded names)
PlanSchema.index({ plan_name: 1, 'company.name': 1, 'community.name': 1, type: 1 }, { unique: true });

export default mongoose.models.Plan || mongoose.model<IPlan>('Plan', PlanSchema);


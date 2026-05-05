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

// Embedded product segment reference (lot-size / line inside a community)
interface IProductSegmentReference {
  _id: Types.ObjectId;
  name: string;   // internal segment name, e.g. "elevon_40s"
  label: string;  // display label, e.g. "40' Lots"
}

/**
 * Origin of a Plan document.
 * - 'manual': created via the app UI / scrape pipeline (the original "V2" data).
 * - 'v1':     imported by the V1 sync (scheduler or manual admin trigger).
 *
 * Default is 'manual' so all pre-existing plans implicitly remain V2.
 */
export type PlanSource = 'manual' | 'v1';

export interface IPlan extends Document {
  plan_name: string;
  price: number;
  sqft?: number;
  stories?: string;
  price_per_sqft?: number;
  last_updated: Date;
  company: ICompanyReference;
  community: ICommunityReference;
  segment?: IProductSegmentReference;  // Optional: product line / lot-size segment
  type: 'plan' | 'now';
  beds?: string;
  baths?: string;
  address?: string;
  design_number?: string;
  price_changed_recently?: boolean;
  /** Origin of this Plan. See PlanSource. */
  source?: PlanSource;
  /**
   * Stable dedupe key for V1-imported plans. Built from
   * `v1::<community>::<company>::<type>::<plan_name>::<address>` (normalized).
   * Sparse + unique so it only constrains rows that have it (i.e. V1 rows).
   */
  externalKey?: string;
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

const ProductSegmentReferenceSchema = new Schema<IProductSegmentReference>({
  _id: {
    type: Schema.Types.ObjectId,
    ref: 'ProductSegment',
    required: true,
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
    segment: {
      type: ProductSegmentReferenceSchema,
      required: false,
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
    source: {
      type: String,
      enum: ['manual', 'v1'],
      default: 'manual',
      index: true,
    },
    externalKey: {
      // Indexed via the explicit sparse-unique PlanSchema.index() below.
      type: String,
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
PlanSchema.index({ 'segment._id': 1, type: 1 });
PlanSchema.index({ 'community._id': 1, 'segment._id': 1, type: 1 });
PlanSchema.index({ 'company.name': 1, type: 1 });
PlanSchema.index({ 'community.name': 1, type: 1 });
PlanSchema.index({ 'community._id': 1, type: 1 });
PlanSchema.index({ price: 1 });
PlanSchema.index({ last_updated: -1 });

// Compound index for uniqueness (using embedded names + segment where present).
// Includes `source` so V1-imported plans can coexist with V2 plans that happen
// to share plan_name + company + community + segment + type. The migration
// `20260505000000_v1_plan_indexes` drops the previous (source-less) unique index.
PlanSchema.index(
  { plan_name: 1, 'company.name': 1, 'community.name': 1, 'segment.name': 1, type: 1, source: 1 },
  { unique: true }
);

// Sparse-unique key for V1-imported plans only. Manual / V2 rows have no
// `externalKey` and are skipped by this index.
PlanSchema.index(
  { externalKey: 1 },
  { unique: true, sparse: true }
);

export default mongoose.models.Plan || mongoose.model<IPlan>('Plan', PlanSchema);


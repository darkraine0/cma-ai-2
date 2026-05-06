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
 * Plan version tag.
 *  1 = imported by V1 sync, untouched.
 *  2 = manual / V2 — created via the app UI, scrape pipeline, or AI assistant.
 *      This is the schema default, so all pre-existing plans implicitly become 2.
 *  3 = was imported as V1 (started as 1) but has since been edited by a user.
 *      The PATCH /api/plans/[id] handler auto-flips 1 -> 3 on any user edit;
 *      the V1 sync never resets this back because it dedupes on `externalKey`
 *      and skips plans that already exist.
 */
export type PlanVersion = 1 | 2 | 3 | 4;

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
  /** Origin / mutation status of this Plan. See PlanVersion. */
  version?: PlanVersion;
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
    version: {
      type: Number,
      enum: [1, 2, 3, 4],
      default: 2,
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
// Includes `version` so V1-imported plans (version=1) can coexist with V2 plans
// (version=2) that happen to share plan_name + company + community + segment + type.
// Migration `20260506000000_plan_source_to_version` drops the previous
// `source`-inclusive index and replaces it with this one.
PlanSchema.index(
  { plan_name: 1, 'company.name': 1, 'community.name': 1, 'segment.name': 1, type: 1, version: 1 },
  { unique: true }
);

// Sparse-unique key for V1-imported plans only. Manual / V2 rows have no
// `externalKey` and are skipped by this index.
PlanSchema.index(
  { externalKey: 1 },
  { unique: true, sparse: true }
);

export default mongoose.models.Plan || mongoose.model<IPlan>('Plan', PlanSchema);


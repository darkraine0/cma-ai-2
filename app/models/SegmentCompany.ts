import mongoose, { Schema, Document, Types } from 'mongoose';
import { SegmentRole } from './ProductSegment';

export type KeyType = 'Plan_Names' | 'Series_Name';

export interface ISegmentCompany extends Document {
  segmentId: Types.ObjectId;          // ProductSegment
  companyId: Types.ObjectId;          // Company
  role: SegmentRole;                  // primary | competitor | cross_community_comp
  sourceCommunityId?: Types.ObjectId;  // For cross-community comps (e.g. Perry @ Avondale)
  notes?: string;
  /** How to match plans: by plan names list or by series name(s) */
  keyType: KeyType;                    // Plan_Names | Series_Name
  /** Plan names (when keyType=Plan_Names) or series name(s) (when keyType=Series_Name) */
  values: string[];
  /** When keyType=Series_Name, optional explicit plan names in that series */
  planNames?: string[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SegmentCompanySchema = new Schema<ISegmentCompany>(
  {
    segmentId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductSegment',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['primary', 'competitor', 'cross_community_comp'],
      required: true,
      default: 'competitor',
      index: true,
    },
    sourceCommunityId: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
    },
    notes: {
      type: String,
    },
    keyType: {
      type: String,
      enum: ['Plan_Names', 'Series_Name'],
      default: 'Plan_Names',
    },
    values: {
      type: [String],
      default: [],
    },
    planNames: {
      type: [String],
      default: undefined,
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

// One config per company per segment
SegmentCompanySchema.index(
  { segmentId: 1, companyId: 1 },
  { unique: true }
);

export default mongoose.models.SegmentCompany || mongoose.model<ISegmentCompany>('SegmentCompany', SegmentCompanySchema);


import mongoose, { Schema, Document, Types } from 'mongoose';

export type IncentiveType =
  | 'flex_cash'
  | 'closing_cost_assistance'
  | 'rate_buydown'
  | 'design_center_credit'
  | 'price_reduction'
  | 'quick_move_in_discount'
  | 'realtor_bonus'
  | 'appliance_or_package'
  | 'lot_premium_discount'
  | 'limited_time_promotion'
  | 'other';

export type IncentiveAmountType = 'dollar' | 'percent' | 'rate' | 'text_only' | 'mixed';
export type IncentiveReviewStatus = 'draft' | 'reviewed' | 'published' | 'rejected';
export type IncentiveConfidence = 'high' | 'medium' | 'low';

export interface ICompetitorIncentive extends Document {
  marketSnapshotId?: Types.ObjectId | null;
  snapshotBuilderSlideId?: Types.ObjectId | null;
  marketCode: string;
  companyId: Types.ObjectId;
  companyName: string;
  communityId?: Types.ObjectId | null;
  communityName?: string | null;
  planId?: Types.ObjectId | null;
  planName?: string | null;
  incentiveType: IncentiveType;
  title: string;
  description?: string;
  amountType: IncentiveAmountType;
  amountValue?: number | null;
  effectiveStartDate?: Date | null;
  effectiveEndDate?: Date | null;
  isActive: boolean;
  reviewStatus: IncentiveReviewStatus;
  sourceConfidence: IncentiveConfidence;
  sourceFilename?: string | null;
  sourceSlideNumber?: number | null;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  reviewedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorIncentiveSchema = new Schema<ICompetitorIncentive>(
  {
    marketSnapshotId: { type: Schema.Types.ObjectId, ref: 'MarketSnapshot', default: null, index: true },
    snapshotBuilderSlideId: { type: Schema.Types.ObjectId, ref: 'SnapshotBuilderSlide', default: null, index: true },
    marketCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    companyName: { type: String, required: true, trim: true, index: true },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', default: null, index: true },
    communityName: { type: String, trim: true, default: null },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', default: null, index: true },
    planName: { type: String, trim: true, default: null },
    incentiveType: {
      type: String,
      enum: [
        'flex_cash',
        'closing_cost_assistance',
        'rate_buydown',
        'design_center_credit',
        'price_reduction',
        'quick_move_in_discount',
        'realtor_bonus',
        'appliance_or_package',
        'lot_premium_discount',
        'limited_time_promotion',
        'other',
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    amountType: {
      type: String,
      enum: ['dollar', 'percent', 'rate', 'text_only', 'mixed'],
      default: 'text_only',
      required: true,
    },
    amountValue: { type: Number, default: null },
    effectiveStartDate: { type: Date, default: null, index: true },
    effectiveEndDate: { type: Date, default: null, index: true },
    isActive: { type: Boolean, default: true, index: true },
    reviewStatus: {
      type: String,
      enum: ['draft', 'reviewed', 'published', 'rejected'],
      default: 'draft',
      index: true,
    },
    sourceConfidence: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    sourceFilename: { type: String, default: null },
    sourceSlideNumber: { type: Number, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

CompetitorIncentiveSchema.index({
  marketCode: 1,
  companyId: 1,
  communityId: 1,
  planId: 1,
  isActive: 1,
});

CompetitorIncentiveSchema.index({
  marketCode: 1,
  reviewStatus: 1,
  createdAt: -1,
});

export default mongoose.models.CompetitorIncentive ||
  mongoose.model<ICompetitorIncentive>('CompetitorIncentive', CompetitorIncentiveSchema);

import mongoose, { Schema, Document, Types } from "mongoose";
export interface IChatLearning extends Document {
  sessionId?: Types.ObjectId | null;
  learningType: string;
  scope: "global" | "community" | "builder" | "product_line" | "plan";
  scopeKey?: string | null;
  summary: string;
  evidence?: Record<string, unknown>;
  confidence: "high" | "moderate" | "low";
  isValidated: boolean;
  validatedBy?: Types.ObjectId | null;
  validatedAt?: Date | null;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
const ChatLearningSchema = new Schema<IChatLearning>({
  sessionId: { type: Schema.Types.ObjectId, ref: "ChatSession", default: null, index: true },
  learningType: { type: String, required: true, trim: true, index: true },
  scope: { type: String, enum: ["global", "community", "builder", "product_line", "plan"], required: true, index: true },
  scopeKey: { type: String, trim: true, default: null, index: true },
  summary: { type: String, required: true, trim: true },
  evidence: { type: Schema.Types.Mixed, default: {} },
  confidence: { type: String, enum: ["high", "moderate", "low"], default: "moderate", index: true },
  isValidated: { type: Boolean, default: false, index: true },
  validatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  validatedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
}, { timestamps: true });
ChatLearningSchema.index({ scope: 1, scopeKey: 1, isValidated: 1, updatedAt: -1 });
export default mongoose.models.ChatLearning || mongoose.model<IChatLearning>("ChatLearning", ChatLearningSchema);

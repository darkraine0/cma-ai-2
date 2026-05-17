import mongoose, { Schema, Document, Types } from "mongoose";
export interface IChatMessage extends Document {
  sessionId: Types.ObjectId;
  role: "user" | "assistant" | "system";
  content: string;
  intent?: string | null;
  entities?: Record<string, unknown>;
  contextSummary?: Record<string, unknown>;
  answerJson?: Record<string, unknown> | null;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
const ChatMessageSchema = new Schema<IChatMessage>({
  sessionId: { type: Schema.Types.ObjectId, ref: "ChatSession", required: true, index: true },
  role: { type: String, enum: ["user", "assistant", "system"], required: true, index: true },
  content: { type: String, required: true },
  intent: { type: String, default: null, index: true },
  entities: { type: Schema.Types.Mixed, default: {} },
  contextSummary: { type: Schema.Types.Mixed, default: {} },
  answerJson: { type: Schema.Types.Mixed, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", index: true, default: null },
}, { timestamps: true });
ChatMessageSchema.index({ sessionId: 1, createdAt: 1 });
export default mongoose.models.ChatMessage || mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);

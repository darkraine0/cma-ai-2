import mongoose, { Schema, Document, Types } from "mongoose";
export interface IChatFeedback extends Document {
  sessionId: Types.ObjectId;
  messageId?: Types.ObjectId | null;
  userMessage: string;
  assistantResponse: Record<string, unknown>;
  correctedResponse?: string | null;
  isHelpful?: boolean | null;
  feedbackNotes?: string | null;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
const ChatFeedbackSchema = new Schema<IChatFeedback>({
  sessionId: { type: Schema.Types.ObjectId, ref: "ChatSession", required: true, index: true },
  messageId: { type: Schema.Types.ObjectId, ref: "ChatMessage", default: null, index: true },
  userMessage: { type: String, required: true },
  assistantResponse: { type: Schema.Types.Mixed, required: true },
  correctedResponse: { type: String, default: null },
  isHelpful: { type: Boolean, default: null, index: true },
  feedbackNotes: { type: String, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
}, { timestamps: true });
export default mongoose.models.ChatFeedback || mongoose.model<IChatFeedback>("ChatFeedback", ChatFeedbackSchema);

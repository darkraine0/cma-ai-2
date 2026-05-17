import mongoose, { Schema, Document, Types } from "mongoose";
export interface IChatSession extends Document {
  conversationId?: string | null;
  title?: string | null;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
const ChatSessionSchema = new Schema<IChatSession>({
  conversationId: { type: String, trim: true, index: true, default: null },
  title: { type: String, trim: true, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", index: true, default: null },
}, { timestamps: true });
ChatSessionSchema.index({ conversationId: 1, createdBy: 1 });
export default mongoose.models.ChatSession || mongoose.model<IChatSession>("ChatSession", ChatSessionSchema);

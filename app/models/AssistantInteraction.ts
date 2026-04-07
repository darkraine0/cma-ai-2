import mongoose, { Schema, Document } from 'mongoose';

export interface IAssistantInteraction extends Document {
  userId: mongoose.Types.ObjectId;
  pathname: string | null;
  userMessage: string;
  assistantReply: string;
  openaiModel: string;
  createdAt: Date;
}

const AssistantInteractionSchema = new Schema<IAssistantInteraction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    pathname: {
      type: String,
      default: null,
    },
    userMessage: {
      type: String,
      required: true,
    },
    assistantReply: {
      type: String,
      required: true,
    },
    openaiModel: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AssistantInteractionSchema.index({ createdAt: -1 });

export default mongoose.models.AssistantInteraction ||
  mongoose.model<IAssistantInteraction>('AssistantInteraction', AssistantInteractionSchema);

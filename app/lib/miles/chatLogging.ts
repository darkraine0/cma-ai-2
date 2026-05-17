import { Types } from "mongoose";
import ChatSession from "@/app/models/ChatSession";
import ChatMessage from "@/app/models/ChatMessage";

export async function getOrCreateMilesSession(params: {
  conversationId?: string | null;
  userId?: string | Types.ObjectId | null;
}) {
  const { conversationId, userId } = params;
  if (conversationId) {
    const existing = await ChatSession.findOne({
      conversationId,
      ...(userId ? { createdBy: userId } : {}),
    });
    if (existing) return existing;
  }
  return ChatSession.create({
    conversationId: conversationId || new Types.ObjectId().toString(),
    createdBy: userId || null,
  });
}

export async function logMilesMessage(params: {
  sessionId: string | Types.ObjectId;
  role: "user" | "assistant" | "system";
  content: string;
  intent?: string | null;
  entities?: Record<string, unknown>;
  contextSummary?: Record<string, unknown>;
  answerJson?: Record<string, unknown> | null;
  userId?: string | Types.ObjectId | null;
}) {
  return ChatMessage.create({
    sessionId: params.sessionId,
    role: params.role,
    content: params.content,
    intent: params.intent || null,
    entities: params.entities || {},
    contextSummary: params.contextSummary || {},
    answerJson: params.answerJson || null,
    createdBy: params.userId || null,
  });
}

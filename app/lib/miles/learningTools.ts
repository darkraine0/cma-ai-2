import { Types } from "mongoose";
import ChatLearning from "@/app/models/ChatLearning";

export async function getValidatedMilesLearnings(params: {
  scope?: "global" | "community" | "builder" | "product_line" | "plan";
  scopeKey?: string | null;
  limit?: number;
}) {
  const filter: Record<string, unknown> = { isValidated: true };
  if (params.scope) filter.scope = params.scope;
  if (params.scopeKey) filter.scopeKey = params.scopeKey;

  return ChatLearning.find(filter).sort({ updatedAt: -1 }).limit(params.limit || 5).lean();
}

export async function createMilesLearningFromCorrection(params: {
  sessionId?: string | Types.ObjectId | null;
  userMessage: string;
  correctedResponse: string;
  scope?: "global" | "community" | "builder" | "product_line" | "plan";
  scopeKey?: string | null;
  userId?: string | Types.ObjectId | null;
}) {
  const summary = params.correctedResponse.trim().slice(0, 1000);
  if (!summary) return null;

  return ChatLearning.create({
    sessionId: params.sessionId || null,
    learningType: `${params.scope || "global"}_correction_pattern`,
    scope: params.scope || "global",
    scopeKey: params.scopeKey || null,
    summary,
    evidence: { source: "user_corrected_response", userMessage: params.userMessage },
    confidence: "moderate",
    isValidated: false,
    createdBy: params.userId || null,
  });
}

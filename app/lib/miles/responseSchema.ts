export const MILES_RESPONSE_JSON_SCHEMA = {
  name: "miles_cma_answer",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      directAnswer: { type: "string" },
      supportingReasoning: { type: "array", items: { type: "string" } },
      comparisonRows: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            builder: { type: ["string", "null"] },
            community: { type: ["string", "null"] },
            basePrice: { type: ["number", "null"] },
            lotWidth: { type: ["string", "null"] },
            incentives: { type: ["string", "null"] },
            pricePerSqft: { type: ["number", "null"] },
            notes: { type: ["string", "null"] }
          },
          required: ["label", "builder", "community", "basePrice", "lotWidth", "incentives", "pricePerSqft", "notes"]
        }
      },
      strategicInsight: { type: "string" },
      confidence: { enum: ["high", "moderate", "low"] },
      dataGaps: { type: "array", items: { type: "string" } },
      facts: { type: "array", items: { type: "string" } },
      interpretation: { type: "string" },
      recommendation: { type: "string" },
      nextBestQuestion: { type: ["string", "null"] },
      suggestedActions: { type: "array", items: { type: "string" } },
      learnedPatternsUsed: { type: "array", items: { type: "string" } },
      mode: { enum: ["standard", "executive", "sales", "pricing", "community_deep_dive"] },
      needsUserInput: { type: "boolean" }
    },
    required: [
      "directAnswer", "supportingReasoning", "comparisonRows", "strategicInsight",
      "confidence", "dataGaps", "facts", "interpretation", "recommendation",
      "nextBestQuestion", "suggestedActions", "learnedPatternsUsed", "mode", "needsUserInput"
    ]
  }
} as const;

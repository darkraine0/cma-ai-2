export type MilesIntent =
  | "pricing_comparison"
  | "pricing_velocity"
  | "incentive_pressure"
  | "community_deep_dive"
  | "plan_level_comp"
  | "sales_talking_points"
  | "executive_summary"
  | "map_or_subcommunity"
  | "general_question";

export function detectMilesIntent(message: string): MilesIntent {
  const text = message.toLowerCase();

  if (/\b(exec|executive|bottom line|quick summary|what matters|for the meeting)\b/.test(text)) return "executive_summary";
  if (/\b(incentive|promo|promotion|buydown|closing cost|flex cash|discount)\b/.test(text)) return "incentive_pressure";
  if (/\b(velocity|movement|moved|changed|trend|last 30|recent)\b/.test(text)) return "pricing_velocity";
  if (/\b(plan|floorplan|spec|qmi|quick move|inventory home)\b/.test(text)) return "plan_level_comp";
  if (/\b(sales|talking point|buyer|objection|script)\b/.test(text)) return "sales_talking_points";
  if (/\b(map|subcommunity|sub-community|phase|pin|marker)\b/.test(text)) return "map_or_subcommunity";
  if (/\b(community|deep dive|positioning|market read)\b/.test(text)) return "community_deep_dive";
  if (/\b(compare|versus|vs|comp|competitor|price|pricing)\b/.test(text)) return "pricing_comparison";

  return "general_question";
}

export function getMilesMode(intent: MilesIntent) {
  switch (intent) {
    case "executive_summary": return "executive";
    case "sales_talking_points": return "sales";
    case "pricing_comparison":
    case "pricing_velocity":
    case "incentive_pressure":
    case "plan_level_comp": return "pricing";
    case "community_deep_dive":
    case "map_or_subcommunity": return "community_deep_dive";
    default: return "standard";
  }
}

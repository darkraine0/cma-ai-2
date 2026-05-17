import type { MilesIntent } from "./intent";

export const MILES_QUESTION_PACKS = {
  executive: [
    "Give me the bottom line on this community versus nearby competitors.",
    "What are the two biggest market signals this week?",
    "What should Brandie know before the pricing meeting?"
  ],
  pricing: [
    "Compare UnionMain pricing against the closest competitor set.",
    "Where are we exposed on price, and where can we defend value?",
    "Run a pricing velocity read for the last 30 days."
  ],
  incentives: [
    "Which builders are using incentives instead of base-price cuts?",
    "Summarize active competitor incentives by builder.",
    "Where are incentives creating the most pressure on UnionMain?"
  ],
  sales: [
    "Turn this comp analysis into sales talking points.",
    "What buyer objections should sales expect?",
    "How should sales explain our value if competitors are cheaper?"
  ],
  community: [
    "Give me a community deep dive with pricing, incentives, and risk.",
    "Which product line is most exposed in this community?",
    "Which competitors overlap most closely with UnionMain here?"
  ]
};

export function getSuggestedActionsForIntent(intent: MilesIntent): string[] {
  switch (intent) {
    case "executive_summary": return ["Run pricing velocity check", "Review incentive pressure"];
    case "pricing_comparison": return ["Compare closest comp set", "Check product-line exposure"];
    case "pricing_velocity": return ["Review last 30 days", "Separate base-price changes from incentives"];
    case "incentive_pressure": return ["Compare current incentives", "Flag new or expired promotions"];
    case "plan_level_comp": return ["Rank plan-level comps", "Check $/SF and lot-width context"];
    case "sales_talking_points": return ["Create buyer-facing talking points", "Prepare objection handling"];
    case "community_deep_dive": return ["Review competitor overlap", "Check product-line positioning"];
    case "map_or_subcommunity": return ["Separate builders by sub-community", "Check duplicate builder placements"];
    default: return ["Run pricing comparison", "Run incentive pressure check"];
  }
}

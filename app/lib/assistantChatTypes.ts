/** Single plan row embedded in a show_plans button. */
export type AssistantPlanItem = {
  id: string;
  display_label: string;
  plan_name?: string;
  address?: string | null;
  company?: string | null;
  price?: number;
  sqft?: number | null;
  beds?: string | null;
  baths?: string | null;
  type?: string;
  days_ago?: number | null;
  /** MongoDB plan id when this row maps to an existing record (update/delete). */
  existing_plan_id?: string;
  /** Set when `planComparison` groups source vs database rows. */
  comparison_bucket?: 'added' | 'differs' | 'only_in_db';
  /** DB snapshot for rows that differ from the live source (display only). */
  existing_price?: number;
  existing_sqft?: number | null;
  existing_company?: string | null;
};

/** Action chips shown under an assistant reply; user clicks to navigate / open modals (no auto-redirect). */
export type AssistantChatButton =
  | { kind: 'add_community'; label: string }
  | { kind: 'go_to_community'; label: string; communitySlug: string }
  | {
      kind: 'go_to_community_chart';
      label: string;
      communitySlug: string;
      /** Matches chart URL ?type= — default now */
      chartType?: 'now' | 'plan';
    }
  | { kind: 'view_plan'; label: string; communitySlug: string; planId: string }
  | { kind: 'add_plan'; label: string; communitySlug: string }
  | { kind: 'edit_plan'; label: string; communitySlug: string; planId: string }
  | { kind: 'delete_plan'; label: string; communitySlug: string; planId: string }
  | {
      /** Opens an in-chat modal listing all embedded plans. User selects one to view/edit/delete. */
      kind: 'show_plans';
      label: string;
      communitySlug: string;
      communityName: string;
      plans: AssistantPlanItem[];
      /** When the community exists in the DB, live web source vs stored plans (add / update / delete). */
      planComparison?: {
        added: AssistantPlanItem[];
        differs: AssistantPlanItem[];
        onlyInDb: AssistantPlanItem[];
      };
    };

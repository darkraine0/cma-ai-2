/** Action chips shown under an assistant reply; user clicks to navigate / open modals (no auto-redirect). */
export type AssistantChatButton =
  | { kind: 'add_community'; label: string }
  | { kind: 'go_to_community'; label: string; communitySlug: string }
  | { kind: 'add_plan'; label: string; communitySlug: string }
  | { kind: 'edit_plan'; label: string; communitySlug: string; planId: string }
  | { kind: 'delete_plan'; label: string; communitySlug: string; planId: string };

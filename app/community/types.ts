export interface Plan {
  plan_name: string;
  price: number;
  sqft: number;
  stories: string;
  price_per_sqft: number;
  last_updated: string;
  price_changed_recently: boolean;
  company: string;
  community: string;
  type: string;
  address?: string;
}

export interface CommunityCompany {
  _id: string;
  name: string;
}

export interface Community {
  _id: string;
  name: string;
  companies: CommunityCompany[];
  description?: string | null;
  location?: string | null;
  parentCommunityId?: string | { _id: string; name: string } | null;
}

export type SortKey = "plan_name" | "price" | "sqft" | "last_updated";
export type SortOrder = "asc" | "desc";

export const PAGE_SIZE = 50;

import { CommunityCompany } from "../types";

/**
 * Extracts company name from various company data formats
 */
export function extractCompanyName(company: string | CommunityCompany | any): string {
  if (typeof company === 'string') {
    return company;
  }
  if (company && typeof company === 'object' && company.name) {
    return company.name;
  }
  return '';
}

/**
 * Normalizes a company name for matching (e.g. "UnionMain Homes" and "UnionMain" both match).
 */
export function normalizeCompanyNameForMatch(name: string): string {
  if (!name || typeof name !== 'string') return '';
  let n = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const suffixes = ["incorporated", "inc", "llc", "ltd", "lp", "homes", "home"];
  let changed = true;
  while (changed) {
    changed = false;
    for (const suf of suffixes) {
      if (n.endsWith(` ${suf}`)) {
        n = n.slice(0, -(suf.length + 1)).trim();
        changed = true;
      } else if (n === suf) {
        n = "";
        changed = true;
      }
    }
  }

  // Also handle merged names like "HighlandHomes" (no space before suffix).
  let compact = n.replace(/\s+/g, "");
  const compactSuffixes = ["incorporated", "inc", "llc", "ltd", "lp", "homes", "home"];
  let compactChanged = true;
  while (compactChanged) {
    compactChanged = false;
    for (const suf of compactSuffixes) {
      if (compact.length > suf.length && compact.endsWith(suf)) {
        compact = compact.slice(0, -suf.length).trim();
        compactChanged = true;
      }
    }
  }
  return compact;
}

/**
 * Returns true if two company names refer to the same company (normalized match).
 */
export function companyNamesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return normalizeCompanyNameForMatch(a) === normalizeCompanyNameForMatch(b);
}

/**
 * Returns true if planCompany is in the community's company set (exact or normalized match).
 */
export function isPlanCompanyInCommunity(planCompany: string, companyNames: Set<string>): boolean {
  if (!planCompany) return false;
  if (companyNames.has(planCompany)) return true;
  const normalized = normalizeCompanyNameForMatch(planCompany);
  for (const name of companyNames) {
    if (normalizeCompanyNameForMatch(name) === normalized) return true;
  }
  return false;
}

/**
 * Extracts all company names from a community
 */
export function getCompanyNames(companies: (string | CommunityCompany)[] | undefined): string[] {
  if (!companies) return [];
  
  return companies
    .map(extractCompanyName)
    .filter(name => name !== '');
}

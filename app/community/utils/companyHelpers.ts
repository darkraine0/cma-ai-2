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
 * Extracts all company names from a community
 */
export function getCompanyNames(companies: (string | CommunityCompany)[] | undefined): string[] {
  if (!companies) return [];
  
  return companies
    .map(extractCompanyName)
    .filter(name => name !== '');
}

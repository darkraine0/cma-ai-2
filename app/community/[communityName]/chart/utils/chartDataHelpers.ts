import { Plan } from "../../../types";
import { getCompanyColor } from "../../../../utils/colors";
import { extractCompanyName } from "../../../utils/companyHelpers";

export interface ChartDataPoint {
  x: number;
  y: number;
}

export interface ChartDataset {
  label: string;
  data: ChartDataPoint[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
  pointRadius: number;
  pointHoverRadius: number;
  fill: boolean;
}

/**
 * Prepares chart datasets for each company.
 * When companyColorMap is provided (e.g. from community's populated companies), stored colors are used for distinct graph lines.
 */
export function prepareChartDatasets(
  plans: Plan[],
  companies: string[],
  companyColorMap?: Record<string, string> | null
): ChartDataset[] {
  return companies.map((company) => {
    const companyPlans = plans.filter((plan) => {
      const planCompany = extractCompanyName(plan.company);
      return planCompany === company && plan.sqft && plan.price;
    });
    
    // Sort by square footage for smooth line rendering
    const sortedPlans = companyPlans.sort((a, b) => a.sqft - b.sqft);
    
    const color = (companyColorMap && companyColorMap[company]) || getCompanyColor(company);
    
    return {
      label: company,
      data: sortedPlans.map((plan) => ({
        x: plan.sqft,
        y: plan.price,
      })),
      borderColor: color,
      backgroundColor: `${color}40`,
      tension: 0.2,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: false,
    };
  });
}

/**
 * Extracts unique square footage values for x-axis
 */
export function extractUniqueSquareFootage(plans: Plan[]): number[] {
  const sqftValues = plans
    .filter((plan) => plan.sqft)
    .map((plan) => plan.sqft);
  
  return Array.from(new Set(sqftValues)).sort((a, b) => a - b);
}

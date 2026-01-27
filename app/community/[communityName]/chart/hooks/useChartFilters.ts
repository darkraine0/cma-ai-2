import { useState, useMemo } from "react";
import { Plan } from "../../../types";
import { extractCompanyName } from "../../../utils/companyHelpers";

interface UseChartFiltersReturn {
  selectedType: string;
  setSelectedType: (type: string) => void;
  filteredPlans: Plan[];
}

export function useChartFilters(
  plans: Plan[],
  companyNamesSet: Set<string>,
  urlType: string | null
): UseChartFiltersReturn {
  const [selectedType, setSelectedType] = useState<string>(
    urlType === 'plan' ? 'Plan' : 'Now'
  );

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const planCompany = extractCompanyName(plan.company);
      const isCompanyInCommunity = companyNamesSet.has(planCompany);
      
      return (
        isCompanyInCommunity &&
        plan.type === selectedType.toLowerCase()
      );
    });
  }, [plans, companyNamesSet, selectedType]);

  return {
    selectedType,
    setSelectedType,
    filteredPlans,
  };
}

import { useState, useMemo } from "react";
import { Plan } from "../../../types";
import { extractCompanyName, isPlanCompanyInCommunity } from "../../../utils/companyHelpers";

export interface ProductLineOption {
  _id: string;
  name: string;
  label: string;
}

interface UseChartFiltersReturn {
  selectedType: string;
  setSelectedType: (type: string) => void;
  selectedProductLineId: string;
  setSelectedProductLineId: (id: string) => void;
  filteredPlans: Plan[];
}

export function useChartFilters(
  plans: Plan[],
  companyNamesSet: Set<string>,
  urlType: string | null,
  productLines: ProductLineOption[] = []
): UseChartFiltersReturn {
  const [selectedType, setSelectedType] = useState<string>(
    urlType === 'plan' ? 'Plan' : 'Now'
  );
  const [selectedProductLineId, setSelectedProductLineId] = useState<string>('__all__');

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const planCompany = extractCompanyName(plan.company);
      const isCompanyInCommunity = isPlanCompanyInCommunity(planCompany, companyNamesSet);
      const matchType = plan.type === selectedType.toLowerCase();
      const planSegmentId = plan.segment?._id ?? null;
      const matchProductLine =
        selectedProductLineId === '__all__' ||
        (selectedProductLineId === '__none__' && !planSegmentId) ||
        planSegmentId === selectedProductLineId;

      return isCompanyInCommunity && matchType && matchProductLine;
    });
  }, [plans, companyNamesSet, selectedType, selectedProductLineId]);

  return {
    selectedType,
    setSelectedType,
    selectedProductLineId,
    setSelectedProductLineId,
    filteredPlans,
  };
}

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
      const planSegmentLabel = plan.segment?.label ?? null;
      // Support merged-<label> so one filter option matches both V1 (v1-price-70s) and V2 segments with same label
      const matchProductLine =
        selectedProductLineId === '__all__' ||
        (selectedProductLineId === '__none__' && !planSegmentId) ||
        planSegmentId === selectedProductLineId ||
        (selectedProductLineId.startsWith('merged-') && planSegmentLabel === selectedProductLineId.replace('merged-', ''));

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

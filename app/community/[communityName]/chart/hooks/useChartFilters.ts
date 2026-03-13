import { useState, useMemo } from "react";
import { Plan } from "../../../types";
import { extractCompanyName, isPlanCompanyInCommunity } from "../../../utils/companyHelpers";

export interface ProductLineOption {
  _id: string;
  name: string;
  label: string;
}

export type VersionFilter = "all" | "v1" | "v2";

function isV1Plan(plan: Plan): boolean {
  return Boolean(plan._id?.toString().startsWith("v1-"));
}

interface UseChartFiltersReturn {
  selectedType: string;
  setSelectedType: (type: string) => void;
  selectedProductLineId: string;
  setSelectedProductLineId: (id: string) => void;
  selectedVersion: VersionFilter;
  setSelectedVersion: (version: VersionFilter) => void;
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
  const [selectedVersion, setSelectedVersion] = useState<VersionFilter>('all');

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

      const matchVersion =
        selectedVersion === 'all' ||
        (selectedVersion === 'v1' && isV1Plan(plan)) ||
        (selectedVersion === 'v2' && !isV1Plan(plan));

      return isCompanyInCommunity && matchType && matchProductLine && matchVersion;
    });
  }, [plans, companyNamesSet, selectedType, selectedProductLineId, selectedVersion]);

  return {
    selectedType,
    setSelectedType,
    selectedProductLineId,
    setSelectedProductLineId,
    selectedVersion,
    setSelectedVersion,
    filteredPlans,
  };
}

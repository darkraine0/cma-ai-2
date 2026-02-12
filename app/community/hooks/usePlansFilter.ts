import { useState, useEffect, useMemo } from "react";
import { Plan, SortKey, SortOrder, PAGE_SIZE } from "../types";
import { extractCompanyName } from "../utils/companyHelpers";

export interface ProductLineOption {
  _id: string;
  name: string;
  label: string;
}

interface UsePlansFilterReturn {
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  selectedCompany: string;
  setSelectedCompany: (company: string) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  selectedProductLineId: string;
  setSelectedProductLineId: (id: string) => void;
  page: number;
  setPage: (page: number) => void;
  paginatedPlans: Plan[];
  totalPages: number;
  handleSort: (key: SortKey) => void;
}

export function usePlansFilter(
  plans: Plan[],
  companyNames: Set<string>,
  productLines: ProductLineOption[] = []
): UsePlansFilterReturn {
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('Now');
  const [selectedProductLineId, setSelectedProductLineId] = useState<string>('__all__');
  const [page, setPage] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [sortKey, sortOrder, selectedCompany, selectedType, selectedProductLineId]);

  // Filter plans
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const planCompany = extractCompanyName(plan.company);
      const isCompanyInCommunity = companyNames.has(planCompany);
      const planSegmentId = plan.segment?._id ?? null;
      const matchProductLine =
        selectedProductLineId === '__all__' ||
        (selectedProductLineId === '__none__' && !planSegmentId) ||
        planSegmentId === selectedProductLineId;

      return (
        isCompanyInCommunity &&
        (selectedCompany === 'All' || planCompany === selectedCompany) &&
        (selectedType === 'Plan' || selectedType === 'Now'
          ? plan.type === selectedType.toLowerCase()
          : true) &&
        matchProductLine
      );
    });
  }, [plans, companyNames, selectedCompany, selectedType, selectedProductLineId]);

  // Sort plans
  const sortedPlans = useMemo(() => {
    return [...filteredPlans].sort((a, b) => {
      let aValue: any = a[sortKey];
      let bValue: any = b[sortKey];

      if (sortKey === "last_updated") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredPlans, sortKey, sortOrder]);

  // Paginate plans
  const totalPages = Math.ceil(sortedPlans.length / PAGE_SIZE);
  const paginatedPlans = useMemo(() => {
    return sortedPlans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [sortedPlans, page]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return {
    sortKey,
    setSortKey,
    sortOrder,
    setSortOrder,
    selectedCompany,
    setSelectedCompany,
    selectedType,
    setSelectedType,
    selectedProductLineId,
    setSelectedProductLineId,
    page,
    setPage,
    paginatedPlans,
    totalPages,
    handleSort,
  };
}

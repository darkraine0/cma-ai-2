import { useMemo } from "react";
import { Plan } from "../../../types";
import { prepareChartDatasets, extractUniqueSquareFootage } from "../utils/chartDataHelpers";

interface UseChartDataReturn {
  chartData: {
    labels: number[];
    datasets: ReturnType<typeof prepareChartDatasets>;
  };
  isEmpty: boolean;
}

export function useChartData(
  plans: Plan[],
  companies: string[],
  companyColorMap?: Record<string, string> | null,
  selectedCommunityName?: string | null
): UseChartDataReturn {
  const datasets = useMemo(
    () => prepareChartDatasets(plans, companies, companyColorMap, selectedCommunityName),
    [plans, companies, companyColorMap, selectedCommunityName]
  );

  const labels = useMemo(
    () => extractUniqueSquareFootage(plans),
    [plans]
  );

  const isEmpty = plans.length === 0;

  return {
    chartData: {
      labels,
      datasets,
    },
    isEmpty,
  };
}

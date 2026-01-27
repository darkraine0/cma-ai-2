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
  companies: string[]
): UseChartDataReturn {
  const datasets = useMemo(
    () => prepareChartDatasets(plans, companies),
    [plans, companies]
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

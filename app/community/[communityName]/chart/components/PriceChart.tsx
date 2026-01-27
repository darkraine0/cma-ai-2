"use client"

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { Chart, LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend } from "chart.js";
import { Plan } from "../../../types";
import { createChartOptions } from "../config/chartConfig";
import { useChartData } from "../hooks/useChartData";
import ChartEmptyState from "./ChartEmptyState";

// Dynamically import Line chart to avoid SSR issues
const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
});

// Register Chart.js components only on client side
if (typeof window !== "undefined") {
  Chart.register(LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend);
}

interface PriceChartProps {
  plans: Plan[];
  companies: string[];
  selectedType: string;
}

export default function PriceChart({
  plans,
  companies,
  selectedType,
}: PriceChartProps) {
  const { chartData, isEmpty } = useChartData(plans, companies);
  const options = useMemo(() => createChartOptions(), []);

  if (isEmpty) {
    return <ChartEmptyState selectedType={selectedType} />;
  }

  return (
    <div className="w-full min-h-[400px] flex items-center justify-center">
      <div className="w-full">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

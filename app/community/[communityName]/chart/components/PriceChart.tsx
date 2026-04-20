"use client"

import React, { useMemo, useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Chart, LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Plan } from "../../../types";
import { createChartOptions, crosshairPlugin } from "../config/chartConfig";
import { useChartData } from "../hooks/useChartData";
import ChartEmptyState from "./ChartEmptyState";
import { Button } from "../../../../components/ui/button";
import { RotateCcw } from "lucide-react";

// Dynamically import Line chart to avoid SSR issues
const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
});

// Register Chart.js components and zoom plugin only on client side
if (typeof window !== "undefined") {
  Chart.register(LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend, zoomPlugin);
}

interface PriceChartProps {
  plans: Plan[];
  companies: string[];
  selectedType: string;
  /** Optional map of company name -> hex color for distinct graph lines (from Company.color). */
  companyColorMap?: Record<string, string> | null;
}

export default function PriceChart({
  plans,
  companies,
  selectedType,
  companyColorMap,
}: PriceChartProps) {
  const { chartData, isEmpty } = useChartData(plans, companies, companyColorMap);
  const [isMobile, setIsMobile] = useState(false);
  const chartRef = useRef<Chart<"line"> | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const options = useMemo(() => createChartOptions(isMobile), [isMobile]);

  const handleResetZoom = () => {
    chartRef.current?.resetZoom();
  };

  if (isEmpty) {
    return <ChartEmptyState selectedType={selectedType} />;
  }

  return (
    <div className="w-full h-[460px] md:h-[560px] flex flex-col">
      <div className="flex items-center justify-end gap-2 mb-2 text-sm text-muted-foreground">
        <span className="hidden sm:inline">Scroll to zoom · Drag rectangle to zoom in · Ctrl+drag to pan</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetZoom}
          className="flex items-center gap-1.5 shrink-0"
          title="Reset zoom to original view"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Zoom
        </Button>
      </div>
      <div className="w-full flex-1 min-h-0">
        <div className="w-full h-full">
          <Line ref={chartRef} data={chartData} options={options} plugins={[crosshairPlugin]} />
        </div>
      </div>
    </div>
  );
}

"use client"

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Chart,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { getRelativePosition } from "chart.js/helpers";
import { Plan } from "../../../types";
import { createChartOptions, crosshairPlugin } from "../config/chartConfig";
import { useChartData } from "../hooks/useChartData";
import ChartEmptyState from "./ChartEmptyState";
import { Button } from "../../../../components/ui/button";
import { RotateCcw, MoveVertical } from "lucide-react";
import type { ChartDataPoint } from "../utils/chartDataHelpers";
import { predictionPriceForSave, roundPredictionPrice } from "../utils/predictionPrice";

const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
});

if (typeof window !== "undefined") {
  Chart.register(
    LineElement,
    PointElement,
    LinearScale,
    Title,
    CategoryScale,
    Tooltip,
    Legend,
    zoomPlugin
  );
}

type DragState = {
  datasetIndex: number;
  index: number;
  planId: string;
  basePrice: number;
  previousY: number;
};

type ScaleBounds = {
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
};

function captureScaleBounds(chart: Chart<"line">): ScaleBounds {
  const x = chart.scales.x;
  const y = chart.scales.y;
  return {
    xMin: typeof x?.min === "number" ? x.min : undefined,
    xMax: typeof x?.max === "number" ? x.max : undefined,
    yMin: typeof y?.min === "number" ? y.min : undefined,
    yMax: typeof y?.max === "number" ? y.max : undefined,
  };
}

function restoreScaleBounds(chart: Chart<"line">, bounds: ScaleBounds) {
  const x = chart.scales.x;
  const y = chart.scales.y;
  if (x && bounds.xMin != null && bounds.xMax != null) {
    x.options.min = bounds.xMin;
    x.options.max = bounds.xMax;
  }
  if (y && bounds.yMin != null && bounds.yMax != null) {
    y.options.min = bounds.yMin;
    y.options.max = bounds.yMax;
  }
}

interface PriceChartProps {
  plans: Plan[];
  companies: string[];
  selectedType: string;
  companyColorMap?: Record<string, string> | null;
  selectedCommunityName?: string | null;
  canEdit?: boolean;
  predictionEditMode?: boolean;
  onPredictionEditModeChange?: (enabled: boolean) => void;
  onPredictionSave?: (
    planId: string,
    predictionPrice: number | null,
    basePrice: number
  ) => Promise<void>;
}

export default function PriceChart({
  plans,
  companies,
  selectedType,
  companyColorMap,
  selectedCommunityName,
  canEdit = false,
  predictionEditMode = false,
  onPredictionEditModeChange,
  onPredictionSave,
}: PriceChartProps) {
  const { chartData, isEmpty } = useChartData(
    plans,
    companies,
    companyColorMap,
    selectedCommunityName
  );
  const [isMobile, setIsMobile] = useState(false);
  const chartRef = useRef<Chart<"line"> | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const savingRef = useRef(false);
  const pendingZoomRestoreRef = useRef<ScaleBounds | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Keep options stable when toggling edit mode — changing `options` resets zoom.
  const options = useMemo(() => createChartOptions({ isMobile }), [isMobile]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const bounds = pendingZoomRestoreRef.current ?? captureScaleBounds(chart);
    pendingZoomRestoreRef.current = null;
    const zoomPlugin = chart.options.plugins?.zoom as
      | { zoom?: { drag?: { enabled?: boolean } } }
      | undefined;
    if (zoomPlugin?.zoom?.drag) {
      zoomPlugin.zoom.drag.enabled = !(canEdit && predictionEditMode);
    }
    restoreScaleBounds(chart, bounds);
    chart.update("none");
  }, [canEdit, predictionEditMode]);

  const handleResetZoom = () => {
    chartRef.current?.resetZoom();
  };

  const handleTogglePredictionEdit = () => {
    const chart = chartRef.current;
    if (chart) {
      pendingZoomRestoreRef.current = captureScaleBounds(chart);
    }
    onPredictionEditModeChange?.(!predictionEditMode);
  };

  const findNearestPoint = useCallback((chart: Chart<"line">, nativeEvent: MouseEvent | TouchEvent) => {
    const hits = chart.getElementsAtEventForMode(
      nativeEvent,
      "nearest",
      { intersect: true },
      true
    );
    if (!hits.length) return null;
    const hit = hits[0];
    const raw = chart.data.datasets[hit.datasetIndex]?.data[hit.index] as ChartDataPoint | undefined;
    if (!raw?.planId) return null;
    return { datasetIndex: hit.datasetIndex, index: hit.index, raw };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !canEdit || !predictionEditMode || !onPredictionSave) return;

    const canvas = chart.canvas;
    const cursorGrab = () => {
      canvas.style.cursor = dragRef.current ? "grabbing" : "grab";
    };

    const onPointerDown = (nativeEvent: MouseEvent | TouchEvent) => {
      if (savingRef.current) return;
      const hit = findNearestPoint(chart, nativeEvent);
      if (!hit) return;
      nativeEvent.preventDefault();
      dragRef.current = {
        datasetIndex: hit.datasetIndex,
        index: hit.index,
        planId: hit.raw.planId,
        basePrice: hit.raw.basePrice,
        previousY: hit.raw.y,
      };
      chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
      chart.update("none");
      cursorGrab();
    };

    const onPointerMove = (nativeEvent: MouseEvent | TouchEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      nativeEvent.preventDefault();
      const pos = getRelativePosition(nativeEvent, chart);
      const yScale = chart.scales.y;
      if (!yScale) return;
      let nextY = yScale.getValueForPixel(pos.y);
      if (typeof nextY !== "number" || !Number.isFinite(nextY)) return;
      const min = typeof yScale.min === "number" ? yScale.min : 0;
      const max = typeof yScale.max === "number" ? yScale.max : nextY;
      nextY = Math.min(max, Math.max(min, roundPredictionPrice(nextY)));
      const point = chart.data.datasets[drag.datasetIndex].data[drag.index] as ChartDataPoint;
      point.y = nextY;
      point.hasPrediction = nextY !== roundPredictionPrice(drag.basePrice);
      point.predictionPrice = point.hasPrediction ? nextY : null;
      chart.update("none");
    };

    const finishDrag = async (nativeEvent: MouseEvent | TouchEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      cursorGrab();

      const point = chart.data.datasets[drag.datasetIndex].data[drag.index] as ChartDataPoint;
      const finalY = point.y;
      const toSave = predictionPriceForSave(finalY, drag.basePrice);
      savingRef.current = true;
      try {
        await onPredictionSave(drag.planId, toSave, drag.basePrice);
      } catch {
        point.y = drag.previousY;
        point.predictionPrice =
          drag.previousY !== roundPredictionPrice(drag.basePrice) ? drag.previousY : null;
        point.hasPrediction = point.predictionPrice != null;
        chart.update("none");
      } finally {
        savingRef.current = false;
      }
      nativeEvent.preventDefault();
    };

    const onMouseDown = (e: MouseEvent) => onPointerDown(e);
    const onMouseMove = (e: MouseEvent) => onPointerMove(e);
    const onMouseUp = (e: MouseEvent) => void finishDrag(e);
    const onTouchStart = (e: TouchEvent) => onPointerDown(e);
    const onTouchMove = (e: TouchEvent) => onPointerMove(e);
    const onTouchEnd = (e: TouchEvent) => void finishDrag(e);

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    canvas.style.cursor = "grab";

    return () => {
      dragRef.current = null;
      canvas.style.cursor = "";
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [canEdit, predictionEditMode, onPredictionSave, findNearestPoint, chartData]);

  if (isEmpty) {
    return <ChartEmptyState selectedType={selectedType} />;
  }

  return (
    <div className="w-full h-[460px] md:h-[560px] flex flex-col">
      <div className="flex items-center justify-end gap-2 mb-2 text-sm text-muted-foreground">
        <span className="hidden sm:inline">
          {canEdit && predictionEditMode
            ? "Drag points up/down to set predicted price ($1k steps) · Scroll to zoom"
            : "Scroll to zoom · Drag rectangle to zoom in · Ctrl+drag to pan"}
        </span>
        {canEdit && onPredictionEditModeChange && (
          <Button
            type="button"
            variant={predictionEditMode ? "default" : "outline"}
            size="sm"
            onClick={handleTogglePredictionEdit}
            className={`flex items-center gap-1.5 shrink-0 ${
              predictionEditMode ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600" : ""
            }`}
            title={
              predictionEditMode
                ? "Exit prediction edit mode"
                : "Drag chart points vertically to set predicted price"
            }
          >
            <MoveVertical className="h-3.5 w-3.5" />
            Edit Prediction
          </Button>
        )}
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

import React from "react";

export default function ChartSkeleton() {
  return (
    <div className="w-full min-h-[500px] md:min-h-[400px] flex items-center justify-center">
      <div className="w-full h-[500px] md:h-[400px] rounded-lg bg-muted/20 animate-pulse flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading chart data...</p>
      </div>
    </div>
  );
}

import React from "react";

interface ChartEmptyStateProps {
  selectedType: string;
}

export default function ChartEmptyState({ selectedType }: ChartEmptyStateProps) {
  return (
    <div className="w-full min-h-[400px] flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <svg 
          className="w-16 h-16 mx-auto mb-4 opacity-50" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
          />
        </svg>
        <p className="text-lg font-medium">
          No {selectedType.toLowerCase()} homes found
        </p>
        <p className="text-sm mt-2">
          There are no plans available to display in the chart.
        </p>
      </div>
    </div>
  );
}

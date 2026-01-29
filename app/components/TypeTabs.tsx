import React from "react";

interface TypeTabsProps {
  selected: string;
  onSelect: (type: string) => void;
}

const TypeTabs: React.FC<TypeTabsProps> = ({ selected, onSelect }) => (
  <div className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
    {["Now", "Plan"].map((type) => (
      <button
        key={type}
        onClick={() => onSelect(type)}
        className={`
          px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200
          ${selected === type
            ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm'
            : 'text-white/70 hover:text-white hover:bg-white/5'
          }
        `}
      >
        {type}
      </button>
    ))}
  </div>
);

export default TypeTabs;


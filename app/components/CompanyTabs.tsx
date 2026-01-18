import React from "react";
import { getCompanyColor } from "../utils/colors";
import { Button } from "./ui/button";

interface CompanyTabsProps {
  companies: string[];
  selected: string;
  onSelect: (c: string) => void;
}

const CompanyTabs: React.FC<CompanyTabsProps> = ({ companies, selected, onSelect }) => {
  return (
    <div className="flex gap-3 mb-6 justify-center flex-wrap">
      {["All", ...companies].map((company) => {
        const active = selected === company;
        const color = getCompanyColor(company);
        
        return (
          <Button
            key={company}
            variant={active ? "default" : "outline"}
            size="default"
            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center ${
              active 
                ? "shadow-md" 
                : "hover:bg-muted"
            }`}
            style={active && company !== "All" ? {
              backgroundColor: color,
              borderColor: color,
              color: 'white'
            } : company !== "All" ? {
              borderColor: color,
              color: color
            } : {}}
            onClick={() => onSelect(company)}
          >
            {company !== "All" && (
              <span 
                className="inline-block w-3 h-3 rounded-full mr-2 border-2 border-current" 
                style={{ backgroundColor: active ? 'white' : color }}
              />
            )}
            {company}
          </Button>
        );
      })}
    </div>
  );
};

export default CompanyTabs;


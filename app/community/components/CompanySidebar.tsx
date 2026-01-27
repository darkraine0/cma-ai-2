import React from "react";
import { getCompanyColor } from "../../utils/colors";

interface CompanySidebarProps {
  companies: string[];
  selectedCompany: string;
  onCompanySelect: (company: string) => void;
}

export default function CompanySidebar({
  companies,
  selectedCompany,
  onCompanySelect,
}: CompanySidebarProps) {
  return (
    <div className="lg:col-span-1 space-y-3">
      {/* All Builders Option */}
      <div
        className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
          selectedCompany === 'All'
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-primary/50'
        }`}
        onClick={() => onCompanySelect('All')}
      >
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm">All Builders</h4>
        </div>
      </div>

      {/* Individual Companies */}
      {companies.map((company) => {
        const color = getCompanyColor(company);

        return (
          <div
            key={company}
            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
              selectedCompany === company
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onCompanySelect(company)}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full border-2"
                style={{ backgroundColor: color, borderColor: color }}
              />
              <h4 className="font-semibold text-sm line-clamp-1">{company}</h4>
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {companies.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No builders found
        </div>
      )}
    </div>
  );
}

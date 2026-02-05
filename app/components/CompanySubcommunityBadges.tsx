"use client"

import React, { memo } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Settings2 } from "lucide-react";

interface CompanySubcommunityBadgesProps {
  companyName: string;
  companyId?: string;
  subcommunities: string[];
  isEditor: boolean;
  hasSubcommunities: boolean;
  onManageClick?: (companyName: string, companyId?: string) => void;
}

const CompanySubcommunityBadges: React.FC<CompanySubcommunityBadgesProps> = ({
  companyName,
  companyId,
  subcommunities,
  isEditor,
  hasSubcommunities,
  onManageClick,
}) => {
  const handleManageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onManageClick?.(companyName, companyId);
  };

  return (
    <div className="flex items-center gap-1.5 ml-5">
      {subcommunities.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {subcommunities.map((subName) => (
            <Badge 
              key={subName} 
              variant="outline" 
              className="text-xs px-1.5 py-0 h-5"
            >
              {subName}
            </Badge>
          ))}
        </div>
      ) : (
        <Badge 
          variant="secondary" 
          className="text-xs px-1.5 py-0 h-5 text-muted-foreground"
        >
          Not assigned
        </Badge>
      )}
      
      {isEditor && hasSubcommunities && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleManageClick}
          className="h-5 w-5 p-0"
          title="Manage subcommunities"
          aria-label={`Manage subcommunities for ${companyName}`}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};

export default memo(CompanySubcommunityBadges);

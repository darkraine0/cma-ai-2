import React from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { getCompanyColor } from "../../utils/colors";
import { extractCompanyName } from "../utils/companyHelpers";
import { Plan, SortKey } from "../types";

interface PlansTableProps {
  plans: Plan[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSort: (key: SortKey) => void;
}

export default function PlansTable({
  plans,
  currentPage,
  totalPages,
  onPageChange,
  onSort,
}: PlansTableProps) {
  if (plans.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No plans found for this community.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => onSort("plan_name")}>
              Plan Name
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => onSort("price")}>
              Price
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => onSort("sqft")}>
              Sq Ft
            </TableHead>
            <TableHead>Stories</TableHead>
            <TableHead>$/Sq Ft</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Company</TableHead>
            <TableHead className="cursor-pointer" onClick={() => onSort("last_updated")}>
              Last Updated
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => {
            const planCompany = extractCompanyName(plan.company);
            const color = getCompanyColor(planCompany);

            return (
              <TableRow
                key={`${plan.plan_name}-${plan.last_updated}-${plan.company}`}
                className={plan.price_changed_recently ? "bg-primary/5" : ""}
              >
                <TableCell className="font-medium">
                  {plan.type === 'now' && plan.address ? plan.address : plan.plan_name}
                </TableCell>
                <TableCell className="font-semibold text-primary">
                  ${plan.price.toLocaleString()}
                </TableCell>
                <TableCell>{plan.sqft?.toLocaleString?.() ?? ""}</TableCell>
                <TableCell>{plan.stories}</TableCell>
                <TableCell>
                  {plan.price_per_sqft ? `$${plan.price_per_sqft.toFixed(2)}` : ""}
                </TableCell>
                <TableCell>
                  <Badge variant={plan.type === 'plan' ? 'secondary' : 'success'}>
                    {plan.type === 'plan' ? 'Plan' : 'Now'}
                  </Badge>
                </TableCell>
                <TableCell className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full border"
                    style={{ backgroundColor: color, borderColor: color }}
                  />
                  {planCompany}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(plan.last_updated).toLocaleString()}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Price Change Legend */}
      <div className="mt-4 text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
        <span className="inline-block w-3 h-3 bg-primary/20 border border-primary/30 rounded-full flex-shrink-0" />
        <span>Highlighted rows indicate a price change in the last 24 hours.</span>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 sm:gap-3 mt-4 sm:mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </Button>
          <span className="text-xs sm:text-sm font-medium text-foreground px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { getCompanyColor } from "../../utils/colors";
import { extractCompanyName } from "../utils/companyHelpers";
import { Plan, PlanSegment, SortKey } from "../types";
import { ProductLineOption } from "../hooks/usePlansFilter";
import EditPlanDialog from "./EditPlanDialog";
import { Pencil } from "lucide-react";
import API_URL from "../../config";
import { cn } from "../../utils/utils";

interface PlansTableProps {
  plans: Plan[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSort: (key: SortKey) => void;
  productLines?: ProductLineOption[];
  onPlanUpdated?: () => void;
  /** When provided, product line changes update this plan in place (no full refetch). */
  onProductLineUpdated?: (planId: string, segment: PlanSegment | null) => void;
  /** When set, shown instead of default message when there are no plans */
  emptyMessage?: string;
}

export default function PlansTable({
  plans,
  currentPage,
  totalPages,
  onPageChange,
  onSort,
  productLines = [],
  onPlanUpdated,
  onProductLineUpdated,
  emptyMessage,
}: PlansTableProps) {
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

  const handleProductLineChange = async (plan: Plan, newSegmentId: string) => {
    if (!plan._id || (!onPlanUpdated && !onProductLineUpdated)) return;
    setUpdatingPlanId(plan._id);
    try {
      const res = await fetch(`${API_URL}/plans/${plan._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmentId: newSegmentId === "__none__" ? null : newSegmentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to update");
      if (onProductLineUpdated) {
        const segment =
          newSegmentId === "__none__"
            ? null
            : (productLines.find((pl) => pl._id === newSegmentId) as PlanSegment | undefined) ?? null;
        onProductLineUpdated(plan._id, segment ?? null);
      } else {
        onPlanUpdated?.();
      }
    } catch {
      // Optionally toast or set error; for now just no-op
    } finally {
      setUpdatingPlanId(null);
    }
  };

  if (plans.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage ?? "No plans found for this community."}
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
            <TableHead className="whitespace-nowrap">Product Line</TableHead>
            <TableHead className="cursor-pointer" onClick={() => onSort("last_updated")}>
              Last Updated
            </TableHead>
            {(onPlanUpdated != null) && (
              <TableHead className="w-[80px] text-right">Edit</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => {
            const planCompany = extractCompanyName(plan.company);
            const color = getCompanyColor(planCompany);

            return (
              <TableRow
                key={plan._id ?? `${plan.plan_name}-${plan.last_updated}-${extractCompanyName(plan.company)}`}
                className={plan.price_changed_recently ? "bg-primary/5" : ""}
              >
                <TableCell className="font-medium whitespace-nowrap" title={plan.type === 'now' && plan.address ? plan.address : plan.plan_name}>
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
                <TableCell className="text-sm text-muted-foreground text-center">
                  {(onPlanUpdated != null || onProductLineUpdated != null) && productLines.length > 0 && plan._id ? (
                    <div className="flex justify-center">
                      <Select
                        value={plan.segment?._id ?? "__none__"}
                        onValueChange={(value) => handleProductLineChange(plan, value)}
                      >
                        <SelectTrigger
                          disabled={updatingPlanId === plan._id}
                          className={cn(
                            "h-8 min-w-[72px] w-auto border-muted font-normal text-muted-foreground justify-center",
                            (plan.segment?._id ?? "__none__") !== "__none__" && "text-foreground"
                          )}
                        >
                          <SelectValue placeholder="Product line">
                            {plan.segment?.label ?? plan.segment?.name ?? "None"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {productLines.map((pl) => (
                            <SelectItem key={pl._id} value={pl._id}>
                              {pl.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    plan.segment?.label ?? plan.segment?.name ?? ""
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(plan.last_updated).toLocaleString()}
                </TableCell>
                {(onPlanUpdated != null) && (
                  <TableCell className="text-right">
                    {plan._id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingPlan(plan);
                          setEditOpen(true);
                        }}
                        title="Edit plan / community info"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                )}
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

      <EditPlanDialog
        plan={editingPlan}
        open={editOpen}
        onOpenChange={setEditOpen}
        productLines={productLines}
        onSaved={() => {
          onPlanUpdated?.();
        }}
      />

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

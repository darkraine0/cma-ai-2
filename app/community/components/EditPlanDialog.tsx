"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Plan } from "../types";
import { extractCompanyName } from "../utils/companyHelpers";
import { ProductLineOption } from "../hooks/usePlansFilter";
import API_URL from "../../config";
import { cn } from "../../utils/utils";

function getCommunityName(community: string | { _id: string; name: string } | undefined): string {
  if (typeof community === "string") return community;
  if (community && typeof community === "object" && "name" in community) return community.name;
  return "";
}

interface EditPlanDialogProps {
  plan: Plan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productLines: ProductLineOption[];
  onSaved: () => void;
}

export default function EditPlanDialog({
  plan,
  open,
  onOpenChange,
  productLines,
  onSaved,
}: EditPlanDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [plan_name, setPlan_name] = useState("");
  const [price, setPrice] = useState("");
  const [sqft, setSqft] = useState("");
  const [stories, setStories] = useState("");
  const [price_per_sqft, setPrice_per_sqft] = useState("");
  const [type, setType] = useState<"plan" | "now">("plan");
  const [address, setAddress] = useState("");
  const [company, setCompany] = useState("");
  const [community, setCommunity] = useState("");
  const [segmentId, setSegmentId] = useState<string>("__none__");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [design_number, setDesign_number] = useState("");

  useEffect(() => {
    if (plan && open) {
      setPlan_name(plan.plan_name ?? "");
      setPrice(String(plan.price ?? ""));
      setSqft(plan.sqft != null ? String(plan.sqft) : "");
      setStories(plan.stories ?? "");
      setPrice_per_sqft(plan.price_per_sqft != null ? String(plan.price_per_sqft) : "");
      setType((plan.type === "now" ? "now" : "plan") as "plan" | "now");
      setAddress(plan.address ?? "");
      setCompany(extractCompanyName(plan.company));
      setCommunity(getCommunityName(plan.community as any));
      setSegmentId(plan.segment?._id ?? "__none__");
      setBeds((plan as any).beds ?? "");
      setBaths((plan as any).baths ?? "");
      setDesign_number((plan as any).design_number ?? "");
      setError("");
    }
  }, [plan, open]);

  useEffect(() => {
    const priceNum = Number(price);
    const sqftNum = Number(sqft);

    if (priceNum > 0 && sqftNum > 0) {
      // Match server logic: round to 2 decimal places
      const calculated = Math.round((priceNum / sqftNum) * 100) / 100;
      setPrice_per_sqft(String(calculated));
    } else {
      setPrice_per_sqft("");
    }
  }, [price, sqft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan?._id) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/plans/${plan._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_name: plan_name.trim() || undefined,
          price: price === "" ? undefined : Number(price),
          sqft: sqft === "" ? undefined : Number(sqft),
          stories: stories.trim() || undefined,
          price_per_sqft: price_per_sqft === "" ? undefined : Number(price_per_sqft),
          type,
          address: address.trim() || undefined,
          // Company and community are read-only and never sent
          segmentId: segmentId === "__none__" ? null : segmentId,
          beds: beds.trim() || undefined,
          baths: baths.trim() || undefined,
          design_number: design_number.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to update plan");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle>Edit plan / community info</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>
          )}
          <div className="space-y-4">
            {/* Plan name - full width */}
            <div>
              <label htmlFor="plan_name" className="block text-sm font-medium mb-1">Plan name</label>
              <Input
                id="plan_name"
                value={plan_name}
                onChange={(e) => setPlan_name(e.target.value)}
                placeholder="Plan name"
              />
            </div>

            {/* Price, Sqft, Stories on one line (desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium mb-1">Price</label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Price"
                />
              </div>
              <div>
                <label htmlFor="sqft" className="block text-sm font-medium mb-1">Sq Ft</label>
                <Input
                  id="sqft"
                  type="number"
                  min={0}
                  value={sqft}
                  onChange={(e) => setSqft(e.target.value)}
                  placeholder="Sq Ft"
                />
              </div>
              <div>
                <label htmlFor="stories" className="block text-sm font-medium mb-1">Stories</label>
                <Input
                  id="stories"
                  value={stories}
                  onChange={(e) => setStories(e.target.value)}
                  placeholder="e.g. 1, 2 Stories"
                />
              </div>
            </div>

            {/* Price per sqft and Type on one line (desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="price_per_sqft" className="block text-sm font-medium mb-1">Price / Sq ft</label>
                <Input
                  id="price_per_sqft"
                  type="number"
                  readOnly
                  min={0}
                  step={0.01}
                  value={price_per_sqft}
                  onChange={(e) => setPrice_per_sqft(e.target.value)}
                  placeholder="Price per sq ft"
                  className="bg-muted cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium mb-1">Type</label>
                <Input
                  id="type"
                  value={type === "now" ? "Now" : "Plan"}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>
            </div>

            {/* Address - full width */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium mb-1">Address (for Now listings)</label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address"
              />
            </div>

            {/* Company, Community, Segment on one line (desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="company" className="block text-sm font-medium mb-1">Company</label>
                <Input
                  id="company"
                  value={company}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                  placeholder="Company / builder"
                />
              </div>
              <div>
                <label htmlFor="community" className="block text-sm font-medium mb-1">Community</label>
                <Input
                  id="community"
                  value={community}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                  placeholder="Community name"
                />
              </div>
              <div>
                <label htmlFor="segment" className="block text-sm font-medium mb-1">Product line</label>
                {productLines.length > 0 ? (
                  <Select value={segmentId} onValueChange={setSegmentId}>
                    <SelectTrigger id="segment">
                      <span className={cn(!segmentId || segmentId === "__none__" ? "text-muted-foreground" : "")}>
                        {segmentId === "__none__" || !segmentId
                          ? "Product line"
                          : productLines.find((p) => p._id === segmentId)?.label ?? segmentId}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {productLines.map((seg) => (
                        <SelectItem key={seg._id} value={seg._id}>
                          {seg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="segment"
                    value={
                      segmentId === "__none__" || !segmentId
                        ? "None"
                        : plan?.segment?.label ?? plan?.segment?.name ?? "None"
                    }
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                )}
              </div>
            </div>

            {/* Beds, Baths, Design number on one line (desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="beds" className="block text-sm font-medium mb-1">Beds</label>
                <Input
                  id="beds"
                  value={beds}
                  onChange={(e) => setBeds(e.target.value)}
                  placeholder="Beds"
                />
              </div>
              <div>
                <label htmlFor="baths" className="block text-sm font-medium mb-1">Baths</label>
                <Input
                  id="baths"
                  value={baths}
                  onChange={(e) => setBaths(e.target.value)}
                  placeholder="Baths"
                />
              </div>
              <div>
                <label htmlFor="design_number" className="block text-sm font-medium mb-1">Design number</label>
                <Input
                  id="design_number"
                  value={design_number}
                  onChange={(e) => setDesign_number(e.target.value)}
                  placeholder="Design number"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6 pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

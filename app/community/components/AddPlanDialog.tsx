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
import { ProductLineOption } from "../hooks/usePlansFilter";
import API_URL from "../../config";
import { cn } from "../../utils/utils";

interface AddPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityName: string;
  companies: string[];
  productLines: ProductLineOption[];
  onSaved: () => void;
}

export default function AddPlanDialog({
  open,
  onOpenChange,
  communityName,
  companies,
  productLines,
  onSaved,
}: AddPlanDialogProps) {
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
  const [segmentId, setSegmentId] = useState<string>("__none__");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [design_number, setDesign_number] = useState("");

  useEffect(() => {
    if (open) {
      setPlan_name("");
      setPrice("");
      setSqft("");
      setStories("");
      setPrice_per_sqft("");
      setType("plan");
      setAddress("");
      setCompany(companies[0] ?? "");
      setSegmentId("__none__");
      setBeds("");
      setBaths("");
      setDesign_number("");
      setError("");
    }
  }, [open, companies]);

  useEffect(() => {
    const priceNum = Number(price);
    const sqftNum = Number(sqft);
    if (priceNum > 0 && sqftNum > 0) {
      const calculated = Math.round((priceNum / sqftNum) * 100) / 100;
      setPrice_per_sqft(String(calculated));
    } else {
      setPrice_per_sqft("");
    }
  }, [price, sqft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyName = (company || "").trim();
    if (!plan_name.trim() || !price || !companyName || !communityName) {
      setError("Plan name, price, company, and community are required.");
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError("Please enter a valid price.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        plan_name: plan_name.trim(),
        price: priceNum,
        company: companyName,
        community: communityName.trim(),
        type,
        address: address.trim() || undefined,
        sqft: sqft ? Number(sqft) : undefined,
        stories: stories.trim() || undefined,
        price_per_sqft: price_per_sqft ? Number(price_per_sqft) : undefined,
        beds: beds.trim() || undefined,
        baths: baths.trim() || undefined,
        design_number: design_number.trim() || undefined,
      };
      if (segmentId && segmentId !== "__none__") {
        body.segmentId = segmentId;
      }
      const res = await fetch(`${API_URL}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to add plan");
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle>Add Plan/Home</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="add-plan_name" className="block text-sm font-medium mb-1">Plan name</label>
              <Input
                id="add-plan_name"
                value={plan_name}
                onChange={(e) => setPlan_name(e.target.value)}
                placeholder="Plan name or model"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="add-price" className="block text-sm font-medium mb-1">Price</label>
                <Input
                  id="add-price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Price"
                  required
                />
              </div>
              <div>
                <label htmlFor="add-sqft" className="block text-sm font-medium mb-1">Sq Ft</label>
                <Input
                  id="add-sqft"
                  type="number"
                  min={0}
                  value={sqft}
                  onChange={(e) => setSqft(e.target.value)}
                  placeholder="Sq Ft"
                />
              </div>
              <div>
                <label htmlFor="add-stories" className="block text-sm font-medium mb-1">Stories</label>
                <Input
                  id="add-stories"
                  value={stories}
                  onChange={(e) => setStories(e.target.value)}
                  placeholder="e.g. 1, 2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="add-price_per_sqft" className="block text-sm font-medium mb-1">Price / Sq ft</label>
                <Input
                  id="add-price_per_sqft"
                  type="number"
                  readOnly
                  min={0}
                  step={0.01}
                  value={price_per_sqft}
                  className="bg-muted cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="add-type" className="block text-sm font-medium mb-1">Type</label>
                <Select value={type} onValueChange={(v) => setType(v as "plan" | "now")}>
                  <SelectTrigger id="add-type">
                    <SelectValue>{type === "now" ? "Now" : "Plan"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plan">Plan</SelectItem>
                    <SelectItem value="now">Now</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label htmlFor="add-address" className="block text-sm font-medium mb-1">Address (for Now listings)</label>
              <Input
                id="add-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="add-company" className="block text-sm font-medium mb-1">Company</label>
                {companies.length > 0 ? (
                  <Select value={company || companies[0]} onValueChange={setCompany}>
                    <SelectTrigger id="add-company">
                      <SelectValue placeholder="Select builder" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="add-company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company / builder"
                    required
                  />
                )}
              </div>
              <div>
                <label htmlFor="add-community" className="block text-sm font-medium mb-1">Community</label>
                <Input
                  id="add-community"
                  value={communityName}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="add-segment" className="block text-sm font-medium mb-1">Product line</label>
                {productLines.length > 0 ? (
                  <Select value={segmentId} onValueChange={setSegmentId}>
                    <SelectTrigger id="add-segment">
                      <span className={cn(!segmentId || segmentId === "__none__" ? "text-muted-foreground" : "")}>
                        {segmentId === "__none__" || !segmentId
                          ? "None"
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
                  <Input id="add-segment" value="None" readOnly className="bg-muted cursor-not-allowed" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="add-beds" className="block text-sm font-medium mb-1">Beds</label>
                <Input
                  id="add-beds"
                  value={beds}
                  onChange={(e) => setBeds(e.target.value)}
                  placeholder="Beds"
                />
              </div>
              <div>
                <label htmlFor="add-baths" className="block text-sm font-medium mb-1">Baths</label>
                <Input
                  id="add-baths"
                  value={baths}
                  onChange={(e) => setBaths(e.target.value)}
                  placeholder="Baths"
                />
              </div>
              <div>
                <label htmlFor="add-design_number" className="block text-sm font-medium mb-1">Design number</label>
                <Input
                  id="add-design_number"
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
              {saving ? "Adding…" : "Add plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

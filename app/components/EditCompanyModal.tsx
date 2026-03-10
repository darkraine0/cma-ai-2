"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import ErrorMessage from "./ErrorMessage";
import { getDistinctCompanyPalette } from "../utils/colors";
import API_URL from "../config";

export interface EditCompanyFormData {
  name: string;
  description?: string;
  website?: string;
  headquarters?: string;
  founded?: string;
  color?: string | null;
}

interface EditCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  /** Initial values. If not provided, name/color can be passed separately for backward compatibility. */
  initialCompany?: EditCompanyFormData | null;
  /** @deprecated Use initialCompany instead */
  companyName?: string;
  /** @deprecated Use initialCompany.color instead */
  initialColor?: string | null;
  onSuccess?: () => void;
}

export default function EditCompanyModal({
  open,
  onOpenChange,
  companyId,
  initialCompany,
  companyName: companyNameProp,
  initialColor: initialColorProp,
  onSuccess,
}: EditCompanyModalProps) {
  const companyName = initialCompany?.name ?? companyNameProp ?? "";
  const initialColor = initialCompany?.color ?? initialColorProp;

  const [name, setName] = useState(companyName);
  const [description, setDescription] = useState(initialCompany?.description ?? "");
  const [website, setWebsite] = useState(initialCompany?.website ?? "");
  const [headquarters, setHeadquarters] = useState(initialCompany?.headquarters ?? "");
  const [founded, setFounded] = useState(initialCompany?.founded ?? "");
  const [color, setColor] = useState(initialColor || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const distinctPalette = getDistinctCompanyPalette();

  useEffect(() => {
    if (open) {
      const c = initialCompany;
      setName(c?.name ?? companyNameProp ?? "");
      setDescription(c?.description ?? "");
      setWebsite(c?.website ?? "");
      setHeadquarters(c?.headquarters ?? "");
      setFounded(c?.founded ?? "");
      setColor((c?.color ?? initialColorProp) || "");
      setError("");
    }
  }, [open, initialCompany, companyNameProp, initialColorProp]);

  const handleSave = async () => {
    setError("");
    setLoading(true);
    try {
      const body: {
        name?: string;
        description?: string;
        website?: string;
        headquarters?: string;
        founded?: string;
        color?: string | null;
      } = {};
      if (name.trim() !== companyName) body.name = name.trim();
      if (description !== (initialCompany?.description ?? "")) body.description = description.trim() || undefined;
      if (website !== (initialCompany?.website ?? "")) body.website = website.trim() || undefined;
      if (headquarters !== (initialCompany?.headquarters ?? "")) body.headquarters = headquarters.trim() || undefined;
      if (founded !== (initialCompany?.founded ?? "")) body.founded = founded.trim() || undefined;
      const newColor = color.trim();
      const prevColor = (initialCompany?.color ?? initialColorProp ?? "").toString().trim();
      if (newColor !== prevColor) {
        body.color = newColor ? newColor : null;
      }
      if (Object.keys(body).length === 0) {
        onOpenChange(false);
        return;
      }
      const res = await fetch(`${API_URL}/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to update company");
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      setError(e.message || "Failed to update company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit company</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium mb-1">Company name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Company name"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Website (optional)</label>
            <Input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Headquarters (optional)</label>
            <Input
              value={headquarters}
              onChange={(e) => setHeadquarters(e.target.value)}
              placeholder="e.g. Dallas, TX"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Founded (optional)</label>
            <Input
              value={founded}
              onChange={(e) => setFounded(e.target.value)}
              placeholder="e.g. 2017"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company Color</label>
            <p className="text-xs text-muted-foreground mb-2">
              Choose a distinct color so this builder is easy to see on the price chart.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {distinctPalette.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
                    color === hex ? "border-primary ring-2 ring-primary/30 scale-110" : "border-border hover:border-primary/50"
                  }`}
                  style={{ backgroundColor: hex }}
                  title={hex}
                  disabled={loading}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color || "#2563eb"}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded border border-border cursor-pointer"
                disabled={loading}
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#2563eb"
                className="flex-1 font-mono text-sm"
                disabled={loading}
              />
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-2">
            <ErrorMessage message={error} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

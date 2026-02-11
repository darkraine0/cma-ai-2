"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/app/components/ui/select";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import API_URL from "@/app/config";

export interface ProductSegmentItem {
  _id: string;
  communityId: string;
  name: string;
  label: string;
  description?: string | null;
  isActive: boolean;
  displayOrder?: number;
}

export interface SegmentCompanyItem {
  _id: string;
  segmentId: string;
  segmentName?: string;
  segmentLabel?: string;
  companyId: string;
  companyName: string;
  role: "primary" | "competitor" | "cross_community_comp";
  sourceCommunityId?: string | null;
  sourceCommunityName?: string | null;
  notes?: string | null;
  keyType: "Plan_Names" | "Series_Name";
  values: string[];
  planNames: string[];
}

interface Company {
  _id: string;
  name: string;
}

interface Community {
  _id?: string | null;
  name: string;
}

interface ProductLinesCardProps {
  communityId: string;
  communityName: string;
  segments: ProductSegmentItem[];
  segmentCompanies: SegmentCompanyItem[];
  companies: Company[];
  communities: Community[];
  loading: boolean;
  onRefetch: () => void;
  isEditor: boolean;
}

function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatLines(arr: string[]): string {
  return Array.isArray(arr) ? arr.join("\n") : "";
}

export default function ProductLinesCard({
  communityId,
  communityName,
  segments,
  segmentCompanies,
  companies,
  communities,
  loading,
  onRefetch,
  isEditor,
}: ProductLinesCardProps) {
  const [addSegmentOpen, setAddSegmentOpen] = useState(false);
  const [editSegment, setEditSegment] = useState<ProductSegmentItem | null>(null);
  const [addBuilderSegmentId, setAddBuilderSegmentId] = useState<string | null>(null);
  const [editBuilder, setEditBuilder] = useState<SegmentCompanyItem | null>(null);

  // Segment form
  const [segName, setSegName] = useState("");
  const [segLabel, setSegLabel] = useState("");
  const [segDescription, setSegDescription] = useState("");
  const [segSaving, setSegSaving] = useState(false);
  const [segDeletingId, setSegDeletingId] = useState<string | null>(null);

  // Builder form
  const [bCompanyId, setBCompanyId] = useState("");
  const [bRole, setBRole] = useState<"primary" | "competitor" | "cross_community_comp">("competitor");
  const [bKeyType, setBKeyType] = useState<"Plan_Names" | "Series_Name">("Plan_Names");
  const [bValuesText, setBValuesText] = useState("");
  const [bPlanNamesText, setBPlanNamesText] = useState("");
  const [bSourceCommunityId, setBSourceCommunityId] = useState("");
  const [bNotes, setBNotes] = useState("");
  const [bSaving, setBSaving] = useState(false);
  const [bDeletingId, setBDeletingId] = useState<string | null>(null);

  const getCompaniesForSegment = (segmentId: string) => {
    return segmentCompanies.filter((sc) => sc.segmentId === segmentId);
  };

  const handleOpenAddSegment = () => {
    setSegName("");
    setSegLabel("");
    setSegDescription("");
    setAddSegmentOpen(true);
  };

  const handleOpenEditSegment = (seg: ProductSegmentItem) => {
    setEditSegment(seg);
    setSegName(seg.name);
    setSegLabel(seg.label);
    setSegDescription(seg.description || "");
  };

  const handleSaveSegment = async (isEdit: boolean) => {
    if (!segName.trim() || !segLabel.trim()) return;
    setSegSaving(true);
    try {
      if (isEdit && editSegment) {
        const res = await fetch(`${API_URL}/product-segments/${editSegment._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: segName.trim(),
            label: segLabel.trim(),
            description: segDescription.trim() || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update segment");
        }
        setEditSegment(null);
      } else {
        const res = await fetch(`${API_URL}/product-segments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            communityId,
            name: segName.trim(),
            label: segLabel.trim(),
            description: segDescription.trim() || null,
            isActive: true,
            displayOrder: segments.length,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create segment");
        }
        setAddSegmentOpen(false);
      }
      onRefetch();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to save segment");
    } finally {
      setSegSaving(false);
    }
  };

  const handleDeleteSegment = async (segmentId: string) => {
    if (!confirm("Delete this product line? Builder configs in it will be removed.")) return;
    setSegDeletingId(segmentId);
    try {
      const res = await fetch(`${API_URL}/product-segments/${segmentId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete segment");
      }
      onRefetch();
    } catch (err: any) {
      alert(err.message || "Failed to delete segment");
    } finally {
      setSegDeletingId(null);
    }
  };

  const handleOpenAddBuilder = (segmentId: string) => {
    setAddBuilderSegmentId(segmentId);
    setBCompanyId("");
    setBRole("competitor");
    setBKeyType("Plan_Names");
    setBValuesText("");
    setBPlanNamesText("");
    setBSourceCommunityId("");
    setBNotes("");
  };

  const handleOpenEditBuilder = (row: SegmentCompanyItem) => {
    setEditBuilder(row);
    setBCompanyId(row.companyId);
    setBRole(row.role);
    setBKeyType(row.keyType);
    setBValuesText(formatLines(row.values));
    setBPlanNamesText(formatLines(row.planNames));
    setBSourceCommunityId(row.sourceCommunityId || "");
    setBNotes(row.notes || "");
  };

  const handleSaveBuilder = async (isEdit: boolean) => {
    const segmentId = isEdit ? editBuilder?.segmentId : addBuilderSegmentId;
    if (!segmentId) return;
    if (!isEdit && !bCompanyId) {
      alert("Select a company.");
      return;
    }
    const values = parseLines(bValuesText);
    if (values.length === 0) {
      alert("Enter at least one value (plan name or series name).");
      return;
    }
    setBSaving(true);
    try {
      if (isEdit && editBuilder) {
        const res = await fetch(`${API_URL}/segment-companies/${editBuilder._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: bRole,
            keyType: bKeyType,
            values,
            planNames: bKeyType === "Series_Name" ? parseLines(bPlanNamesText) : undefined,
            sourceCommunityId: bSourceCommunityId || undefined,
            notes: bNotes.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update builder config");
        }
        setEditBuilder(null);
      } else {
        const res = await fetch(`${API_URL}/segment-companies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            segmentId,
            companyId: bCompanyId,
            role: bRole,
            keyType: bKeyType,
            values,
            planNames: bKeyType === "Series_Name" ? parseLines(bPlanNamesText) : undefined,
            sourceCommunityId: bSourceCommunityId || undefined,
            notes: bNotes.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to add builder");
        }
        setAddBuilderSegmentId(null);
      }
      onRefetch();
    } catch (err: any) {
      alert(err.message || "Failed to save builder config");
    } finally {
      setBSaving(false);
    }
  };

  const handleDeleteBuilder = async (id: string) => {
    if (!confirm("Remove this builder from the product line?")) return;
    setBDeletingId(id);
    try {
      const res = await fetch(`${API_URL}/segment-companies/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove builder");
      }
      setEditBuilder(null);
      setAddBuilderSegmentId(null);
      onRefetch();
    } catch (err: any) {
      alert(err.message || "Failed to remove builder");
    } finally {
      setBDeletingId(null);
    }
  };

  const sortedSegments = [...segments].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  );

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Product Lines (Segments)</CardTitle>
            {!loading && segments.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                {segments.length} segment{segments.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Define product lines (e.g. 40&apos; vs 50&apos; lots) and assign builders with plan/series mapping for each.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading product lines...</span>
            </div>
          ) : sortedSegments.length === 0 ? (
            <div className="text-left">
              <p className="text-sm text-muted-foreground mb-4">No product lines yet.</p>
              {isEditor && (
                <Button variant="outline" size="sm" onClick={handleOpenAddSegment} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Product Line
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedSegments.map((seg) => {
                const builders = getCompaniesForSegment(seg._id);
                return (
                  <div
                    key={seg._id}
                    className="rounded-lg border bg-muted/50 p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{seg.label}</span>
                        <span className="text-xs text-muted-foreground">({seg.name})</span>
                        {!seg.isActive && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      {isEditor && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEditSegment(seg)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteSegment(seg._id)}
                            disabled={segDeletingId === seg._id}
                          >
                            {segDeletingId === seg._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => handleOpenAddBuilder(seg._id)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Builder
                          </Button>
                        </div>
                      )}
                    </div>
                    {seg.description && (
                      <p className="text-xs text-muted-foreground">{seg.description}</p>
                    )}
                    {builders.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No builders configured.</p>
                    ) : (
                      <ul className="space-y-2">
                        {builders.map((b) => (
                          <li
                            key={b._id}
                            className="flex items-start justify-between gap-2 py-2 px-3 bg-background rounded border text-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-medium">{b.companyName}</div>
                              <div className="text-muted-foreground text-xs mt-0.5">
                                {b.keyType}: {b.values.slice(0, 3).join(", ")}
                                {b.values.length > 3 ? ` +${b.values.length - 3} more` : ""}
                                {b.keyType === "Series_Name" && b.planNames.length > 0 && (
                                  <> · Plans: {b.planNames.slice(0, 2).join(", ")}{b.planNames.length > 2 ? "…" : ""}</>
                                )}
                              </div>
                              {(b.sourceCommunityName || b.notes) && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {b.sourceCommunityName && <span>Source: {b.sourceCommunityName}</span>}
                                  {b.sourceCommunityName && b.notes && " · "}
                                  {b.notes && <span>{b.notes}</span>}
                                </div>
                              )}
                            </div>
                            {isEditor && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleOpenEditBuilder(b)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteBuilder(b._id)}
                                  disabled={bDeletingId === b._id}
                                >
                                  {bDeletingId === b._id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
              {isEditor && (
                <Button variant="outline" size="sm" onClick={handleOpenAddSegment} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Product Line
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Segment Dialog */}
      <Dialog open={addSegmentOpen} onOpenChange={setAddSegmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product Line</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name (internal)</label>
              <Input
                value={segName}
                onChange={(e) => setSegName(e.target.value)}
                placeholder="e.g. 40s"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Label (display)</label>
              <Input
                value={segLabel}
                onChange={(e) => setSegLabel(e.target.value)}
                placeholder="e.g. 40' Lots"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <Input
                value={segDescription}
                onChange={(e) => setSegDescription(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter className="mt-6 pt-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="default"
              className="bg-foreground text-background hover:bg-foreground/90"
              onClick={() => handleSaveSegment(false)}
              disabled={segSaving}
            >
              {segSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Segment Dialog */}
      <Dialog open={!!editSegment} onOpenChange={(open) => !open && setEditSegment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product Line</DialogTitle>
          </DialogHeader>
          {editSegment && (
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Name (internal)</label>
                  <Input
                    value={segName}
                    onChange={(e) => setSegName(e.target.value)}
                    placeholder="e.g. 40s"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Label (display)</label>
                  <Input
                    value={segLabel}
                    onChange={(e) => setSegLabel(e.target.value)}
                    placeholder="e.g. 40' Lots"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description (optional)</label>
                  <Input
                    value={segDescription}
                    onChange={(e) => setSegDescription(e.target.value)}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              <DialogFooter className="mt-6 pt-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  variant="default"
                  className="bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => handleSaveSegment(true)}
                  disabled={segSaving}
                >
                  {segSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Builder Dialog */}
      <Dialog
        open={!!addBuilderSegmentId || !!editBuilder}
        onOpenChange={(open) => {
          if (!open) {
            setAddBuilderSegmentId(null);
            setEditBuilder(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editBuilder ? "Edit Builder Config" : "Add Builder to Product Line"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editBuilder && (
              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <Select value={bCompanyId} onValueChange={setBCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {editBuilder && (
              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <p className="text-sm py-2">{editBuilder.companyName}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <Select value={bRole} onValueChange={(v: any) => setBRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="competitor">Competitor</SelectItem>
                  <SelectItem value="cross_community_comp">Cross-community comp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Match by</label>
              <Select value={bKeyType} onValueChange={(v: any) => setBKeyType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Plan_Names">Plan names</SelectItem>
                  <SelectItem value="Series_Name">Series name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {bKeyType === "Plan_Names" ? "Plan names (one per line)" : "Series name(s) (one per line)"}
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-lg border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={bValuesText}
                onChange={(e) => setBValuesText(e.target.value)}
                placeholder={bKeyType === "Plan_Names" ? "Burnet\nBlackburn\nChisolm" : "Traditional"}
              />
            </div>
            {bKeyType === "Series_Name" && (
              <div>
                <label className="block text-sm font-medium mb-1">Plan names in series (optional, one per line)</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-lg border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={bPlanNamesText}
                  onChange={(e) => setBPlanNamesText(e.target.value)}
                  placeholder="Melrose\nCorrigan\nStatler"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Source community (optional)</label>
              <Select value={bSourceCommunityId || "_none_"} onValueChange={(v) => setBSourceCommunityId(v === "_none_" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Same community" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">Same community</SelectItem>
                  {communities.filter((c) => c._id && c._id !== communityId).map((c) => (
                    <SelectItem key={String(c._id)} value={String(c._id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note (optional)</label>
              <Input
                value={bNotes}
                onChange={(e) => setBNotes(e.target.value)}
                placeholder="e.g. Maps to Edgewater 40s"
              />
            </div>
          </div>
          <DialogFooter className="mt-6 pt-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="default"
              className="bg-foreground text-background hover:bg-foreground/90"
              onClick={() => handleSaveBuilder(!!editBuilder)}
              disabled={bSaving}
            >
              {bSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editBuilder ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

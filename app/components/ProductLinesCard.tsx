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

interface ProductLinesCardProps {
  communityId: string;
  communityName: string;
  segments: ProductSegmentItem[];
  loading: boolean;
  onRefetch: () => void;
  isEditor: boolean;
}

export default function ProductLinesCard({
  communityId,
  communityName,
  segments,
  loading,
  onRefetch,
  isEditor,
}: ProductLinesCardProps) {
  const [addSegmentOpen, setAddSegmentOpen] = useState(false);
  const [editSegment, setEditSegment] = useState<ProductSegmentItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState<ProductSegmentItem | null>(null);

  // Segment form (only name; label is derived from name, description removed)
  const [segName, setSegName] = useState("");
  const [segSaving, setSegSaving] = useState(false);
  const [segDeletingId, setSegDeletingId] = useState<string | null>(null);

  const handleOpenAddSegment = () => {
    setSegName("");
    setAddSegmentOpen(true);
  };

  const handleOpenEditSegment = (seg: ProductSegmentItem) => {
    setEditSegment(seg);
    setSegName(seg.name);
  };

  const handleSaveSegment = async (isEdit: boolean) => {
    if (!segName.trim()) return;
    setSegSaving(true);
    try {
      if (isEdit && editSegment) {
        const res = await fetch(`${API_URL}/product-segments/${editSegment._id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: segName.trim(),
            label: segName.trim(),
            description: null,
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
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            communityId,
            name: segName.trim(),
            label: segName.trim(),
            description: null,
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

  const handleOpenDeleteConfirm = (seg: ProductSegmentItem) => {
    setSegmentToDelete(seg);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteSegment = async () => {
    if (!segmentToDelete) return;
    setSegDeletingId(segmentToDelete._id);
    setDeleteConfirmOpen(false);
    try {
      const res = await fetch(`${API_URL}/product-segments/${segmentToDelete._id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete segment");
      }
      onRefetch();
    } catch (err: any) {
      alert(err.message || "Failed to delete segment");
    } finally {
      setSegDeletingId(null);
      setSegmentToDelete(null);
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
            <CardTitle className="text-lg">Product Lines</CardTitle>
            {!loading && segments.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                {segments.length} segment{segments.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Define product lines (e.g. 40&apos; vs 50&apos; lots) for this community.
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
            <div className="flex flex-col items-start gap-3">
              <div className="flex flex-wrap gap-2 justify-start">
                {sortedSegments.map((seg) => (
                  <div
                    key={seg._id}
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-3 py-2 w-fit max-w-full"
                  >
                    <span className="font-medium whitespace-nowrap">{seg.label}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">({seg.name})</span>
                    {!seg.isActive && (
                      <Badge variant="outline" className="text-xs shrink-0">Inactive</Badge>
                    )}
                    {isEditor && (
                      <div className="flex items-center gap-0.5 ml-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleOpenEditSegment(seg)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleOpenDeleteConfirm(seg)}
                          disabled={segDeletingId === seg._id}
                        >
                          {segDeletingId === seg._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    )}
                    {seg.description && (
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={seg.description}>
                        {seg.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product Line</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {segmentToDelete && (
              <>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete the product line <strong>&quot;{segmentToDelete.label}&quot;</strong>?
                </p>
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
                  Warning: Builder configs in this product line will be removed.
                </p>
              </>
            )}
          </div>
          <DialogFooter className="mt-6 pt-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="default"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteSegment}
              disabled={segDeletingId !== null}
            >
              {segDeletingId === segmentToDelete?._id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

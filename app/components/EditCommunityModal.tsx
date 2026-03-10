"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Loader2, ImagePlus } from "lucide-react";
import ErrorMessage from "./ErrorMessage";
import API_URL from "../config";
import { getCommunityCardImage } from "../utils/communityImages";

export interface EditCommunityModalCommunity {
  _id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  imagePath?: string | null;
  hasImage?: boolean;
}

interface EditCommunityModalProps {
  community: EditCommunityModalCommunity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function EditCommunityModal({
  community,
  open,
  onOpenChange,
  onSuccess,
}: EditCommunityModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [communityImageFile, setCommunityImageFile] = useState<File | null>(null);
  const [communityImagePreviewUrl, setCommunityImagePreviewUrl] = useState<string | null>(null);
  const [removeCommunityImage, setRemoveCommunityImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (community && open) {
      setName(community.name);
      setDescription(community.description ?? "");
      setLocation(community.location ?? "");
      setCommunityImageFile(null);
      setCommunityImagePreviewUrl(null);
      setRemoveCommunityImage(false);
      if (communityImagePreviewUrl) URL.revokeObjectURL(communityImagePreviewUrl);
      setError("");
    }
  }, [community, open]);

  const handleCommunityImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (e.g. JPG, PNG, WebP)");
      return;
    }
    if (communityImagePreviewUrl) URL.revokeObjectURL(communityImagePreviewUrl);
    setCommunityImageFile(file);
    setCommunityImagePreviewUrl(URL.createObjectURL(file));
    setRemoveCommunityImage(false);
    setError("");
  };

  const clearCommunityImage = () => {
    if (communityImagePreviewUrl) URL.revokeObjectURL(communityImagePreviewUrl);
    setCommunityImageFile(null);
    setCommunityImagePreviewUrl(null);
    setRemoveCommunityImage(true);
  };

  const handleSave = async () => {
    if (!community?._id) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Community name is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let imagePath: string | null | undefined;
      if (communityImageFile) {
        const formData = new FormData();
        formData.append("image", communityImageFile);
        const uploadRes = await fetch(API_URL + "/communities/upload-image", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to upload image");
        }
        const uploadJson = await uploadRes.json();
        imagePath = uploadJson.path ?? null;
      } else if (removeCommunityImage) {
        imagePath = null;
      }

      const body: Record<string, unknown> = {
        name: trimmedName,
        description: description.trim() || null,
        location: location.trim() || null,
      };
      if (imagePath !== undefined) body.imagePath = imagePath;

      const res = await fetch(API_URL + `/communities/${community._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update community");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (!community) return null;

  const communityImgSrc =
    communityImagePreviewUrl ??
    (removeCommunityImage ? getCommunityCardImage({ name: community.name }) : null) ??
    ((community.imagePath || (community.hasImage && community._id ? `/api/communities/${community._id}/image` : null)) ?? getCommunityCardImage(community));
  const hasCurrentCommunityImage = !removeCommunityImage && (!!community.imagePath || !!community.hasImage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Community</DialogTitle>
        </DialogHeader>
        <DialogClose />

        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">Community Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Elevon at Lavon"
              className="w-full px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Community description..."
              className="w-full px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Location (Optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Dallas, TX"
              className="w-full px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
          </div>

          {/* Community image (card/listing) */}
          <div>
            <label className="block text-sm font-medium mb-2">Community image (card)</label>
            <p className="text-xs text-muted-foreground mb-2">
              Shown on the community card on the listing page.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="rounded-md border border-border overflow-hidden bg-muted/30 w-20 h-14 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={communityImgSrc}
                  alt="Community card"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-muted/50 hover:bg-muted text-sm cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCommunityImageChange}
                    disabled={loading}
                  />
                  <ImagePlus className="h-4 w-4" />
                  Change image
                </label>
                {hasCurrentCommunityImage && !communityImagePreviewUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={clearCommunityImage}
                    disabled={loading}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={loading || !name.trim()}
              className="flex-1 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

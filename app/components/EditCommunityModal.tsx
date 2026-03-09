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
import { Loader2, ImagePlus, X } from "lucide-react";
import ErrorMessage from "./ErrorMessage";
import API_URL from "../config";
import { getCommunityImage } from "../utils/communityImages";

export interface EditCommunityModalCommunity {
  _id: string;
  name: string;
  /** Dedicated banner image URL (used for community header). */
  bannerPath?: string | null;
  hasBanner?: boolean;
  /** Legacy/generic image; not used for banner when bannerPath exists. */
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (community && open) {
      setImageFile(null);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
      setError("");
    }
  }, [community, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (e.g. JPG, PNG, WebP)");
      return;
    }
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  const clearImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  const handleSave = async () => {
    if (!community?._id) return;
    setLoading(true);
    setError("");
    try {
      let bannerPath: string | null | undefined;
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
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
        bannerPath = uploadJson.path ?? null;
      } else {
        // No new file selected — don't change banner
        onOpenChange(false);
        return;
      }

      const res = await fetch(API_URL + `/communities/${community._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannerPath }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update banner");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBanner = async () => {
    if (!community?._id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL + `/communities/${community._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannerPath: null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove banner");
      }
      clearImage();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (!community) return null;

  const currentBannerUrl =
    imagePreviewUrl ??
    (community.bannerPath ?? null) ??
    getCommunityImage(community);
  const hasCurrentBanner = !!(community.bannerPath || community.hasBanner);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Change banner image</DialogTitle>
        </DialogHeader>
        <DialogClose />

        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">Banner image</label>
            <p className="text-xs text-muted-foreground mb-2">
              This image is shown in the header on the community page.
            </p>
            <div className="space-y-2">
              {imagePreviewUrl ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreviewUrl}
                    alt="New banner preview"
                    className="h-32 w-auto rounded-md border border-border object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                    onClick={clearImage}
                    disabled={loading}
                    aria-label="Remove selected image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <img
                    src={currentBannerUrl}
                    alt={community.name}
                    className="h-24 w-auto rounded-md border border-border object-cover"
                  />
                  <label className="flex flex-col items-center justify-center h-24 px-4 rounded-md border-2 border-dashed border-border bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                      disabled={loading}
                    />
                    <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground text-center">
                      Change image
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {hasCurrentBanner && !imagePreviewUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleRemoveBanner}
              disabled={loading}
            >
              Remove banner
            </Button>
          )}

          {error && <ErrorMessage message={error} />}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={loading || !imageFile}
              className="flex-1 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
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

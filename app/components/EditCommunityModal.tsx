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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (community && open) {
      setName(community.name);
      setDescription(community.description ?? "");
      setLocation(community.location ?? "");
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
      setError("Please select an image file (e.g. JPG, PNG)");
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
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Community name is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let imagePath: string | undefined;
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("name", trimmedName);
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
        imagePath = uploadJson.path;
      }

      const res = await fetch(API_URL + `/communities/${community._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
          location: location.trim() || null,
          ...(imagePath !== undefined && { imagePath }),
        }),
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

  const currentImageUrl = imagePreviewUrl ?? (community.imagePath || (community.hasImage && community._id ? `/api/communities/${community._id}/image` : null)) ?? getCommunityImage(community);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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

          <div>
            <label className="block text-sm font-medium mb-2">
              Image (Optional)
            </label>
            <div className="space-y-2">
              {imagePreviewUrl ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreviewUrl}
                    alt="Community preview"
                    className="h-32 w-auto rounded-md border border-border object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                    onClick={clearImage}
                    disabled={loading}
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <img
                    src={currentImageUrl}
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
                    <span className="text-xs text-muted-foreground">
                      Change image
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {error && (
            <ErrorMessage message={error} />
          )}

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

"use client"

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Plus, Loader2, Sparkles, Search, ImagePlus, X } from "lucide-react";
import ErrorMessage from "./ErrorMessage";
import API_URL from '../config';

interface AddCommunityModalProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

interface CommunityRecommendation {
  name: string;
  description: string | null;
  location: string | null;
  alreadyExists: boolean;
}

export default function AddCommunityModal({ onSuccess, trigger }: AddCommunityModalProps) {
  const [open, setOpen] = useState(false);
  const [communityName, setCommunityName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendations, setRecommendations] = useState<CommunityRecommendation[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityRecommendation | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [activeTab, setActiveTab] = useState("ai");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const resetForm = () => {
    setCommunityName("");
    setDescription("");
    setLocation("");
    setError("");
    setSearchQuery("");
    setRecommendations([]);
    setSelectedCommunity(null);
    setShowRecommendations(false);
    setActiveTab("ai");
    setImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
  };

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

  const handleClose = () => {
    if (!loading && !loadingAI) {
      setOpen(false);
      resetForm();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading && !loadingAI) {
      setOpen(newOpen);
      if (!newOpen) {
        resetForm();
      }
    }
  };

  const handleAddCommunity = async () => {
    if (!communityName.trim()) {
      setError("Please enter a community name");
      return;
    }

    setLoading(true);
    setError("");
    try {
      let imagePath: string | undefined;
      let imageData: string | undefined;
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("name", communityName.trim());
        const uploadRes = await fetch(API_URL + "/communities/upload-image", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to upload image");
        }
        const uploadJson = await uploadRes.json();
        // API returns path (Cloudinary URL) or imageData (base64 fallback)
        imageData = uploadJson.imageData;
        imagePath = uploadJson.path;
      }
      const res = await fetch(API_URL + "/communities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: communityName.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          imagePath: imagePath || undefined,
          imageData: imageData || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add community");
      }

      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchCommunities = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search term");
      return;
    }

    setLoadingAI(true);
    setError("");
    setRecommendations([]);
    setSelectedCommunity(null);
    setShowRecommendations(true);
    
    try {
      const res = await fetch(API_URL + "/communities/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchQuery: searchQuery.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to search communities with AI");
      }

      setRecommendations(data.communities || []);
      
      if (!data.communities || data.communities.length === 0) {
        setError("No communities found. Try a different search term.");
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setShowRecommendations(false);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSelectCommunity = (community: CommunityRecommendation) => {
    if (community.alreadyExists) {
      setError(`Community "${community.name}" already exists in the system.`);
      return;
    }

    setSelectedCommunity(community);
    setCommunityName(community.name);
    setDescription(community.description || "");
    setLocation(community.location || "");
    setShowRecommendations(false);
    setSearchQuery("");
    // Keep in same tab - don't switch
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Community
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Community</DialogTitle>
          {/* <DialogDescription>
            {selectedCommunity
              ? "Review and edit the selected community information below, then click 'Add Community' to confirm."
              : "Search for Union Main Homes communities using AI or create a new one manually."}
          </DialogDescription> */}
        </DialogHeader>
        <DialogClose />

        <div className="space-y-4 mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Search
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            {/* AI Search Tab */}
            <TabsContent value="ai" className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Search for Union Main Homes Communities
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., Elevon, Cambridge, Dallas communities..."
                    className="flex-1 px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !loadingAI && searchQuery.trim()) {
                        handleSearchCommunities();
                      }
                    }}
                    disabled={loading || loadingAI}
                  />
                  <Button
                    onClick={handleSearchCommunities}
                    disabled={loadingAI || !searchQuery.trim()}
                    variant="default"
                    className="flex items-center gap-2"
                  >
                    {loadingAI ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Recommendations List */}
              {!selectedCommunity && showRecommendations && recommendations.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-3 bg-muted/50">
                  <p className="text-sm font-medium mb-2">Recommended Communities:</p>
                  {recommendations.map((community, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-all hover:border-primary ${
                        community.alreadyExists ? 'opacity-60' : ''
                      }`}
                      onClick={() => handleSelectCommunity(community)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm">{community.name}</h3>
                              {community.alreadyExists && (
                                <Badge variant="secondary" className="text-xs">
                                  Already Exists
                                </Badge>
                              )}
                            </div>
                            {community.description && (
                              <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                                {community.description}
                              </p>
                            )}
                            {community.location && (
                              <p className="text-xs text-muted-foreground">📍 {community.location}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Selected Community Details - Editable */}
              {selectedCommunity && (
                <div className="space-y-4 border-t pt-4">
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                    <p className="text-sm text-primary font-medium mb-2">
                      ✓ Community selected! Review and edit below, then confirm.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCommunity(null);
                        setCommunityName("");
                        setDescription("");
                        setLocation("");
                        setShowRecommendations(true);
                      }}
                      className="text-xs"
                    >
                      ← Select Different Community
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Community Name *
                    </label>
                    <input
                      type="text"
                      value={communityName}
                      onChange={(e) => setCommunityName(e.target.value)}
                      placeholder="Community name..."
                      className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={loading || loadingAI}
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
                      className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={loading || loadingAI}
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
                      className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={loading || loadingAI}
                    />
                  </div>
                </div>
              )}

              {loadingAI && !showRecommendations && !selectedCommunity && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Searching for communities...</p>
                </div>
              )}

              {/* Action Buttons for AI Tab - Show when community is selected */}
              {activeTab === "ai" && selectedCommunity && (
                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                  <Button
                    onClick={handleAddCommunity}
                    disabled={loading || loadingAI || !communityName.trim()}
                    className="flex-1 flex items-center justify-center gap-2"
                    variant="default"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Confirm & Add Community
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedCommunity(null);
                      setCommunityName("");
                      setDescription("");
                      setLocation("");
                      setSearchQuery("");
                      setShowRecommendations(true);
                    }}
                    disabled={loading || loadingAI}
                    className="flex-1"
                    variant="outline"
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Community Name *
                </label>
                <input
                  type="text"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  placeholder="e.g., Elevon, Cambridge, Brookville..."
                  className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !loading && !loadingAI && communityName.trim()) {
                      handleAddCommunity();
                    }
                  }}
                  disabled={loading || loadingAI}
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
                  className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={loading || loadingAI}
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
                  className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={loading || loadingAI}
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
                        className="h-32 w-auto rounded-md border-2 border-border object-cover"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                        onClick={clearImage}
                        disabled={loading || loadingAI}
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label key={imagePreviewUrl ?? "image-upload"} className="flex flex-col items-center justify-center w-full h-24 rounded-md border-2 border-dashed border-border bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                        disabled={loading || loadingAI}
                      />
                      <ImagePlus className="h-8 w-8 text-muted-foreground mb-1" />
                      <span className="text-sm text-muted-foreground">
                        Add picture
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="mt-4">
              <ErrorMessage message={error} />
            </div>
          )}

          {/* Action Buttons for Manual Tab - Show when community name is entered */}
          {activeTab === "manual" && communityName.trim() && (
            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
              <Button
                onClick={handleAddCommunity}
                disabled={loading || loadingAI || !communityName.trim()}
                className="flex-1 flex items-center justify-center gap-2"
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Community
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


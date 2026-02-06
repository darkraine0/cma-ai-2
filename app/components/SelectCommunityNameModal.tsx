"use client"

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Loader2 } from "lucide-react";
import ErrorMessage from "./ErrorMessage";
import API_URL from '../config';

interface Subcommunity {
  _id: string;
  name: string;
  location?: string;
}

interface SelectCommunityNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentCommunityId: string;
  parentCommunityName: string;
  onSelect: (communityId: string, communityName: string) => void;
  companyName?: string; // Optional: to show in the title
}

export default function SelectCommunityNameModal({
  open,
  onOpenChange,
  parentCommunityId,
  parentCommunityName,
  onSelect,
  companyName,
}: SelectCommunityNameModalProps) {
  const [subcommunities, setSubcommunities] = useState<Subcommunity[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>(parentCommunityId);
  const [selectedCommunityName, setSelectedCommunityName] = useState<string>(parentCommunityName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const fetchSubcommunities = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_URL}/communities?parentId=${parentCommunityId}`);
        if (!res.ok) throw new Error("Failed to fetch subcommunities");
        
        const data: Subcommunity[] = await res.json();
        setSubcommunities(data);
        
        // Default to parent
        setSelectedCommunityId(parentCommunityId);
        setSelectedCommunityName(parentCommunityName);
      } catch (err: any) {
        setError(err.message || "Failed to load subcommunities");
      } finally {
        setLoading(false);
      }
    };

    fetchSubcommunities();
  }, [open, parentCommunityId, parentCommunityName]);

  const handleSelectCommunity = (id: string, name: string) => {
    setSelectedCommunityId(id);
    setSelectedCommunityName(name);
  };

  const handleContinue = () => {
    onSelect(selectedCommunityId, selectedCommunityName);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Community Name</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {companyName 
              ? `Which name does ${companyName} use for this location?`
              : 'Choose which name to use for adding the company'}
          </p>
        </DialogHeader>

        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto py-2">
            {/* Parent Community Option */}
            <div
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedCommunityId === parentCommunityId
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
              onClick={() => handleSelectCommunity(parentCommunityId, parentCommunityName)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{parentCommunityName}</span>
                {selectedCommunityId === parentCommunityId && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Subcommunities */}
            {subcommunities.map((sub) => (
              <div
                key={sub._id}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedCommunityId === sub._id
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
                onClick={() => handleSelectCommunity(sub._id, sub.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-sm font-semibold">{sub.name}</span>
                    {sub.location && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📍 {sub.location}
                      </p>
                    )}
                  </div>
                  {selectedCommunityId === sub._id && (
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ml-2">
                      <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleContinue} disabled={loading}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

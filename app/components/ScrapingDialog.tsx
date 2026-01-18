"use client"

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import API_URL from '../config';

interface ScrapingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  communityName: string;
  onComplete?: () => void;
}

interface ScrapingResult {
  success: boolean;
  message?: string;
  saved?: number;
  errors?: number;
  errorDetails?: Array<{ plan: string; error: string }>;
  breakdown?: {
    now: { saved: number; errors: number };
    plan: { saved: number; errors: number };
  };
  plans?: Array<{
    id: string;
    plan_name: string;
    price: number;
    company: string;
    community: string;
    type: 'plan' | 'now';
  }>;
  error?: string;
}

export default function ScrapingDialog({
  open,
  onOpenChange,
  companyName,
  communityName,
  onComplete,
}: ScrapingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && companyName && communityName) {
      startScraping();
    } else if (!open) {
      // Reset state when dialog closes
      setResult(null);
      setError(null);
      setLoading(false);
    }
  }, [open, companyName, communityName]);

  const startScraping = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(API_URL + "/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company: companyName,
          community: communityName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to scrape plans");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Unknown error occurred during scraping");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      if (onComplete && result) {
        onComplete();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Scraping Plans for {companyName} - {communityName}
          </DialogTitle>
        </DialogHeader>
        <DialogClose disabled={loading} />

        <div className="space-y-4 mt-4">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Scraping plans...</p>
              <p className="text-sm text-muted-foreground mt-2">
                This may take a few moments. Please wait.
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <XCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-lg font-medium text-destructive">Scraping Failed</p>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {error}
              </p>
              <Button onClick={startScraping} className="mt-4" variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {/* Success State */}
          {result && !loading && !error && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-2">
                {result.success !== false ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                )}
                <div className="flex-1">
                  <p className="font-medium">
                    {result.success !== false
                      ? "Scraping Completed"
                      : "Scraping Completed with Errors"}
                  </p>
                  {result.message && (
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {result.saved || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Plans Saved
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-destructive">
                        {result.errors || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Errors</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown */}
              {result.breakdown && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="font-medium mb-3">Breakdown by Type</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Quick Move-ins</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {result.breakdown.now.saved} saved
                          </Badge>
                          {result.breakdown.now.errors > 0 && (
                            <Badge variant="destructive">
                              {result.breakdown.now.errors} errors
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Home Plans</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {result.breakdown.plan.saved} saved
                          </Badge>
                          {result.breakdown.plan.errors > 0 && (
                            <Badge variant="destructive">
                              {result.breakdown.plan.errors} errors
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error Details */}
              {result.errorDetails && result.errorDetails.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="font-medium mb-3 text-destructive">
                      Error Details
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.errorDetails.map((errorDetail, index) => (
                        <div
                          key={index}
                          className="text-sm p-2 bg-destructive/10 rounded border border-destructive/20"
                        >
                          <p className="font-medium">{errorDetail.plan}</p>
                          <p className="text-muted-foreground text-xs">
                            {errorDetail.error}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Plans List (if available) */}
              {result.plans && result.plans.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="font-medium mb-3">Scraped Plans</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {result.plans.slice(0, 10).map((plan) => (
                        <div
                          key={plan.id}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{plan.plan_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {plan.type === "now" ? "Quick Move-in" : "Home Plan"} • $
                              {plan.price.toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {plan.type}
                          </Badge>
                        </div>
                      ))}
                      {result.plans.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          ... and {result.plans.length - 10} more plans
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleClose} variant="default">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


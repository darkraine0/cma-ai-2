"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";

interface GitHubDeviceAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceCode: string;
  authUrl?: string;
}

export default function GitHubDeviceAuthDialog({
  open,
  onOpenChange,
  deviceCode,
  authUrl = "https://github.com/login/device",
}: GitHubDeviceAuthDialogProps) {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(deviceCode);
  };

  const handleOpenUrl = () => {
    window.open(authUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>GitHub Device authentication</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Visit the URL below, sign in, and enter the following device code to continue.
          </p>
          
          {/* Device Code */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Device Code</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-center">
                <span className="text-lg font-mono font-semibold text-blue-700 dark:text-blue-300">
                  {deviceCode}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyCode}
                className="shrink-0"
                title="Copy device code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Authentication URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Authentication URL</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2 rounded-lg border-2 border-border bg-muted/50 text-sm break-all">
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {authUrl}
                </a>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleOpenUrl}
                className="shrink-0"
                title="Open in browser"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-6 pt-4 border-t">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client"

import { Card, CardContent } from "@/app/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function PendingApprovalBanner() {
  return (
    <Card className="border-yellow-500 bg-yellow-500/10 mb-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="font-semibold text-yellow-800 dark:text-yellow-200">
              Account Pending Approval
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Your account is pending admin approval. You have limited access until approved.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

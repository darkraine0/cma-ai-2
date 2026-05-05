"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import Loader from "@/app/components/Loader"
import { Users, CheckCircle2, Clock, XCircle, Shield, RefreshCw, Database } from "lucide-react"

interface V1SyncSummary {
  totalCommunities: number
  totalFetched: number
  totalInserted: number
  totalSkippedExisting: number
  totalSkippedInvalid: number
  totalErrors: number
  durationMs?: number
  startedAt?: string
  finishedAt?: string
}

interface V1SyncState {
  running: boolean
  v1RunningSince: string | null
  v1LastRunAt: string | null
  v1LastFetched: number
  v1LastInserted: number
  v1LastError: string | null
  v1LastSummary: V1SyncSummary | null
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never"
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return "Never"
  const diff = Date.now() - then
  if (diff < 0) return "Just now"
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ${min % 60}m ago`
  const day = Math.floor(hr / 24)
  return `${day}d ${hr % 24}h ago`
}

function formatDuration(ms: number | undefined): string {
  if (!ms || !Number.isFinite(ms)) return "—"
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  return `${min}m ${sec % 60}s`
}

/**
 * Read a Response into JSON, but tolerate non-JSON bodies (HTML error pages,
 * Next.js dev "An error occurred…" payloads, etc.). Returns either the parsed
 * JSON object or `{ __nonJson: true, text }` so the caller can produce a
 * useful message instead of crashing on `Unexpected token`.
 */
async function safeReadJson(
  res: Response
): Promise<{ ok: true; data: any } | { ok: false; text: string }> {
  const text = await res.text()
  if (!text) return { ok: false, text: "(empty response)" }
  try {
    return { ok: true, data: JSON.parse(text) }
  } catch {
    return { ok: false, text: text.slice(0, 300) }
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    rejectedUsers: 0,
    pendingPermissionRequests: 0,
  })
  const [loading, setLoading] = useState(true)
  const [v1State, setV1State] = useState<V1SyncState | null>(null)
  const [v1Message, setV1Message] = useState<string | null>(null)
  const v1WasRunningRef = useRef<boolean>(false)

  const fetchV1State = useCallback(async (): Promise<V1SyncState | null> => {
    try {
      const res = await fetch("/api/admin/sync-v1", { cache: "no-store" })
      const parsed = await safeReadJson(res)
      if (!parsed.ok) {
        console.error("V1 sync state response was not JSON:", parsed.text)
        return null
      }
      if (!res.ok) {
        console.error("V1 sync state fetch failed:", parsed.data)
        return null
      }
      const data = parsed.data as V1SyncState
      setV1State(data)
      return data
    } catch (err) {
      console.error("Error fetching V1 sync state:", err)
      return null
    }
  }, [])

  // While a sync is running (locally triggered or from another trigger like
  // the scheduler / CLI), poll every 2s. Stop polling as soon as `running`
  // flips to false, then surface a completion / error message based on the
  // final persisted state.
  useEffect(() => {
    if (!v1State?.running) {
      // Just finished — derive the right message from the persisted state.
      if (v1WasRunningRef.current && v1State) {
        v1WasRunningRef.current = false
        if (v1State.v1LastError) {
          setV1Message(`Sync failed: ${v1State.v1LastError}`)
        } else if (v1State.v1LastSummary) {
          const s = v1State.v1LastSummary
          setV1Message(
            `Sync complete in ${formatDuration(s.durationMs)} — inserted ` +
              `${s.totalInserted} new plans ` +
              `(${s.totalFetched} fetched, ${s.totalSkippedExisting} already existed` +
              `${s.totalErrors > 0 ? `, ${s.totalErrors} errors` : ""}).`
          )
        }
      }
      return
    }

    v1WasRunningRef.current = true
    const intervalId = window.setInterval(() => {
      void fetchV1State()
    }, 2000)
    return () => window.clearInterval(intervalId)
  }, [v1State?.running, v1State, fetchV1State])

  const handleV1Sync = useCallback(async () => {
    if (v1State?.running) return
    setV1Message("Sync started — polling for progress…")

    let res: Response
    try {
      res = await fetch("/api/admin/sync-v1", { method: "POST" })
    } catch (err) {
      setV1Message(
        `Could not start sync: ${err instanceof Error ? err.message : "network error"}`
      )
      return
    }

    const parsed = await safeReadJson(res)
    if (!parsed.ok) {
      setV1Message(
        `Could not start sync — server returned an unexpected response. ` +
          `(HTTP ${res.status}). First bytes: "${parsed.text.slice(0, 80)}…"`
      )
      return
    }

    const data = parsed.data as {
      accepted?: boolean
      running?: boolean
      message?: string
      error?: string
    }

    if (res.status === 202 && data.accepted) {
      // Kick off polling immediately so the spinner shows up right away.
      await fetchV1State()
      return
    }

    if (res.status === 409) {
      setV1Message(data.message || "A V1 sync is already in progress.")
      await fetchV1State()
      return
    }

    setV1Message(
      `Could not start sync: ${data.error || data.message || `HTTP ${res.status}`}`
    )
  }, [v1State?.running, fetchV1State])

  useEffect(() => {
    fetchStats()
    void fetchV1State()
  }, [fetchV1State])

  const fetchStats = async () => {
    try {
      const [usersResponse, requestsResponse] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/permission-requests"),
      ]);

      if (!usersResponse.ok) throw new Error("Failed to fetch users");
      
      const usersData = await usersResponse.json();
      const users = usersData.users || [];

      let pendingRequests = 0;
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        pendingRequests = requestsData.requests?.filter((r: any) => r.status === 'pending').length || 0;
      }

      setStats({
        totalUsers: users.length,
        pendingUsers: users.filter((u: any) => u.status === "pending").length,
        approvedUsers: users.filter((u: any) => u.status === "approved").length,
        rejectedUsers: users.filter((u: any) => u.status === "rejected").length,
        pendingPermissionRequests: pendingRequests,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <Loader />
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">Overview of user management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-amber-600">{stats.pendingUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Permission Requests</CardTitle>
              <Shield className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-blue-600">{stats.pendingPermissionRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Approved Users</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-emerald-600">{stats.approvedUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* V1 Sync */}
        <Card className="mb-6 md:mb-8">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Database className="w-5 h-5" />
                V1 Plan Sync
                {v1State?.running && (
                  <Badge className="bg-blue-500 text-xs">Running</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Pull V1 plan data from the upstream API into the database.
                Runs automatically every {process.env.NEXT_PUBLIC_V1_SYNC_INTERVAL_HOURS || "24"} hours;
                use the button below for an on-demand run.
              </CardDescription>
            </div>
            <Button
              onClick={handleV1Sync}
              disabled={v1State?.running}
              className="flex-shrink-0"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${v1State?.running ? "animate-spin" : ""}`} />
              {v1State?.running ? "Syncing…" : "Sync V1 now"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">
                  {v1State?.running ? "Started" : "Last sync"}
                </div>
                <div className="text-sm font-semibold mt-1">
                  {v1State?.running
                    ? formatRelativeTime(v1State?.v1RunningSince ?? null)
                    : formatRelativeTime(v1State?.v1LastRunAt ?? null)}
                </div>
                {(v1State?.running ? v1State?.v1RunningSince : v1State?.v1LastRunAt) && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(
                      (v1State?.running
                        ? v1State?.v1RunningSince
                        : v1State?.v1LastRunAt) as string
                    ).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">Plans fetched (last run)</div>
                <div className="text-lg font-bold mt-1">{v1State?.v1LastFetched ?? 0}</div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">Plans inserted (last run)</div>
                <div className="text-lg font-bold mt-1 text-emerald-600">
                  {v1State?.v1LastInserted ?? 0}
                </div>
              </div>
            </div>
            {v1Message && (
              <div className="text-sm text-muted-foreground bg-muted/40 border border-border rounded-md p-3">
                {v1Message}
              </div>
            )}
            {v1State?.v1LastError && !v1State.running && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mt-3">
                Last run error: {v1State.v1LastError}
              </div>
            )}
            {v1State?.v1LastSummary && v1State.v1LastSummary.totalErrors > 0 && !v1State.running && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3 mt-3">
                {v1State.v1LastSummary.totalErrors} community/communities reported errors
                during the last sync. Check server logs for details.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Quick Actions</CardTitle>
            <CardDescription className="text-sm">Manage users and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => window.location.href = '/admin/users'}
              >
                <div className="flex items-center gap-2 flex-1">
                  <Users className="w-5 h-5 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-semibold text-sm md:text-base">Manage User Approvals</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">Review and approve user registrations</div>
                  </div>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => window.location.href = '/admin/permission-requests'}
              >
                <div className="flex items-center gap-2 flex-1">
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <div className="font-semibold text-sm md:text-base flex items-center gap-2">
                      Review Permission Requests
                      {stats.pendingPermissionRequests > 0 && (
                        <Badge className="bg-amber-500 text-xs">{stats.pendingPermissionRequests}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground hidden sm:block">Handle permission upgrade requests</div>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

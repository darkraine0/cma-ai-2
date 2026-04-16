"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import {
  Check,
  Eye,
  LineChart,
  List,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react"
import { Badge } from "@/app/components/ui/badge"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/app/components/ui/card"
import { useAuth } from "@/app/contexts/AuthContext"
import { useToast } from "@/app/components/ui/use-toast"
import { cn } from "@/app/utils/utils"
import type { AssistantChatButton, AssistantPlanItem } from "@/app/lib/assistantChatTypes"
import API_URL from "@/app/config"

const publicRoutes = ["/signin", "/signup", "/forgot-password", "/reset-password", "/verify-email"]

const WELCOME_EDITOR =
  "Use the shortcuts below when they appear, or type what you want to do. Buttons open the right screen (Add Community, go to a community or its price chart, view a specific plan, add/edit/delete a plan). Nothing changes until you click a button."

const WELCOME_VIEWER =
  "Use the shortcuts below when they appear, or type what you want to do. You can search communities and plans, open a community or its price chart, and view plans. Your account is view-only — you cannot add or change communities or plans from here. Nothing changes until you click a button."

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  buttons?: AssistantChatButton[]
}

type ShowPlansButton = Extract<AssistantChatButton, { kind: "show_plans" }>

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function slugFromPathname(path: string | null): string | null {
  if (!path?.startsWith("/community/")) return null
  const seg = path.slice("/community/".length).split("/")[0]
  if (!seg) return null
  try {
    return decodeURIComponent(seg).toLowerCase()
  } catch {
    return seg.toLowerCase()
  }
}

function formatPrice(price?: number): string {
  if (!price) return "—"
  return "$" + price.toLocaleString()
}

// ─── Plan List Modal ──────────────────────────────────────────────────────────

type EditForm = {
  id: string
  /** When set, save uses PATCH to update the existing MarketMap plan. */
  existingPlanId?: string
  plan_name: string
  price: string
  sqft: string
  company: string
  type: "plan" | "now"
  address: string
  beds: string
  baths: string
}

type PlanModalProps = {
  button: ShowPlansButton
  canManage: boolean
  onClose: () => void
}

function planMatchesFilter(p: AssistantPlanItem, filter: string) {
  if (!filter.trim()) return true
  const q = filter.toLowerCase()
  return (
    p.display_label?.toLowerCase().includes(q) ||
    p.company?.toLowerCase().includes(q) ||
    p.plan_name?.toLowerCase().includes(q) ||
    p.address?.toLowerCase().includes(q)
  )
}

function PlanListModal({ button, canManage, onClose }: PlanModalProps) {
  const [filter, setFilter] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState("")
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  const pc = button.planComparison
  const filtered = filter.trim()
    ? button.plans.filter((p) => planMatchesFilter(p, filter))
    : button.plans

  const filteredAdded =
    pc?.added.filter(
      (p) => !savedIds.has(p.id) && planMatchesFilter(p, filter)
    ) ?? []
  const filteredDiffers =
    pc?.differs.filter(
      (p) => !savedIds.has(p.id) && planMatchesFilter(p, filter)
    ) ?? []
  const filteredOnlyDb =
    pc?.onlyInDb.filter((p) => {
      const key = p.existing_plan_id || p.id
      if (deletedIds.has(key)) return false
      return planMatchesFilter(p, filter)
    }) ?? []

  const showComparisonIdle =
    !!pc &&
    pc.added.every((p) => savedIds.has(p.id)) &&
    pc.differs.every((p) => savedIds.has(p.id)) &&
    pc.onlyInDb.every((p) => deletedIds.has(p.existing_plan_id || p.id))

  const hasAnyFiltered =
    filteredAdded.length > 0 ||
    filteredDiffers.length > 0 ||
    filteredOnlyDb.length > 0

  async function handleAdd(plan: AssistantPlanItem) {
    if (savingId || savedIds.has(plan.id)) return
    setSavingId(plan.id)
    setSaveError("")
    try {
      const res = await fetch(`${API_URL}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_name: (plan.plan_name || plan.display_label).trim(),
          price: plan.price,
          company: (plan.company || "").trim(),
          community: button.communityName,
          type: plan.type || "plan",
          address: plan.address?.trim() || undefined,
          sqft: plan.sqft || undefined,
          beds: plan.beds?.trim() || undefined,
          baths: plan.baths?.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || d.message || "Failed to add plan")
      }
      setSavedIds((prev) => new Set([...prev, plan.id]))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to add plan")
    } finally {
      setSavingId(null)
    }
  }

  function openEdit(plan: AssistantPlanItem) {
    setEditForm({
      id: plan.id,
      existingPlanId: plan.existing_plan_id,
      plan_name: plan.plan_name || plan.display_label || "",
      price: plan.price != null ? String(plan.price) : "",
      sqft: plan.sqft != null ? String(plan.sqft) : "",
      company: plan.company || "",
      type: plan.type === "now" ? "now" : "plan",
      address: plan.address || "",
      beds: plan.beds || "",
      baths: plan.baths || "",
    })
    setSaveError("")
  }

  async function handleApplyNew(plan: AssistantPlanItem) {
    if (!plan.existing_plan_id || savingId || savedIds.has(plan.id)) return
    const priceNum = Number(plan.price)
    if (!plan.plan_name?.trim() && !plan.display_label?.trim()) {
      setSaveError("Source data is missing a plan name.")
      return
    }
    if (!priceNum || !(plan.company || "").trim()) {
      setSaveError("Source data is missing price or company.")
      return
    }
    setSavingId(plan.id)
    setSaveError("")
    try {
      const res = await fetch(`${API_URL}/plans/${plan.existing_plan_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_name: (plan.plan_name || plan.display_label).trim(),
          price: priceNum,
          company: (plan.company || "").trim(),
          community: button.communityName,
          type: plan.type === "now" ? "now" : "plan",
          address: plan.address?.trim() || undefined,
          sqft: plan.sqft != null ? Number(plan.sqft) : undefined,
          beds: plan.beds?.trim() || undefined,
          baths: plan.baths?.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || d.message || "Failed to update plan")
      }
      setSavedIds((prev) => new Set([...prev, plan.id]))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update plan")
    } finally {
      setSavingId(null)
    }
  }

  async function handleDeletePlan(plan: AssistantPlanItem) {
    const oid = plan.existing_plan_id || plan.id
    if (!oid || deleteLoadingId) return
    setDeleteLoadingId(oid)
    setSaveError("")
    try {
      const res = await fetch(`${API_URL}/plans/${oid}`, { method: "DELETE" })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || d.message || "Failed to delete plan")
      }
      setDeletedIds((prev) => new Set([...prev, oid]))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete plan")
    } finally {
      setDeleteLoadingId(null)
    }
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editForm) return
    const priceNum = Number(editForm.price)
    if (!editForm.plan_name.trim() || !priceNum || !editForm.company.trim()) {
      setSaveError("Plan name, price, and company are required.")
      return
    }
    setEditSaving(true)
    setSaveError("")
    try {
      const body = {
        plan_name: editForm.plan_name.trim(),
        price: priceNum,
        company: editForm.company.trim(),
        community: button.communityName,
        type: editForm.type,
        address: editForm.address.trim() || undefined,
        sqft: editForm.sqft ? Number(editForm.sqft) : undefined,
        beds: editForm.beds.trim() || undefined,
        baths: editForm.baths.trim() || undefined,
      }
      const url = editForm.existingPlanId
        ? `${API_URL}/plans/${editForm.existingPlanId}`
        : `${API_URL}/plans`
      const method = editForm.existingPlanId ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || d.message || "Failed to save plan")
      }
      setSavedIds((prev) => new Set([...prev, editForm.id]))
      setEditForm(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save plan")
    } finally {
      setEditSaving(false)
    }
  }

  const colSpan = canManage ? 6 : 5

  function renderPlanRow(
    plan: AssistantPlanItem,
    mode: "legacy" | "add" | "differs" | "only_in_db"
  ) {
    const isSaving = savingId === plan.id
    const isSaved = savedIds.has(plan.id)
    const oid = plan.existing_plan_id || plan.id
    const isDeleting = deleteLoadingId === oid
    return (
      <tr key={`${mode}-${plan.id}`} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
        <td className="px-6 py-2.5">
          <div className="font-medium text-foreground leading-tight">{plan.display_label}</div>
          {plan.comparison_bucket === "differs" && plan.existing_price != null && (
              <div className="text-[11px] text-muted-foreground mt-1">
                Database: {formatPrice(plan.existing_price)}
                {plan.existing_sqft != null ? ` · ${Number(plan.existing_sqft).toLocaleString()} sqft` : ""}
                {plan.existing_company ? ` · ${plan.existing_company}` : ""}
              </div>
            )}
          <div className="text-[11px] mt-0.5 flex items-center gap-1">
            {plan.type === "now" && (
              <span className="inline-flex items-center rounded px-1 py-0 text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                Spec
              </span>
            )}
            {plan.type === "plan" && (
              <span className="inline-flex items-center rounded px-1 py-0 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                Floor Plan
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{plan.company ?? "—"}</td>
        <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatPrice(plan.price)}</td>
        <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums hidden sm:table-cell">
          {plan.sqft ? plan.sqft.toLocaleString() : "—"}
        </td>
        <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums hidden sm:table-cell">
          {plan.beds || plan.baths ? `${plan.beds ?? "—"} / ${plan.baths ?? "—"}` : "—"}
        </td>
        {canManage && (
          <td className="px-3 py-2.5">
            <div className="flex flex-wrap gap-1 justify-end items-center">
              {mode === "legacy" && (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title="Edit before saving"
                    onClick={() => openEdit(plan)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-7 w-7",
                      isSaved
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={isSaved ? "Saved to DB" : "Save to DB"}
                    disabled={isSaving || isSaved}
                    onClick={() => handleAdd(plan)}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isSaved ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </>
              )}
              {mode === "add" && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2 text-xs"
                    title="Edit before saving"
                    onClick={() => openEdit(plan)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="h-7 px-2 text-xs"
                    disabled={isSaving || isSaved}
                    onClick={() => handleAdd(plan)}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isSaved ? (
                      "Saved"
                    ) : (
                      "Add"
                    )}
                  </Button>
                </>
              )}
              {mode === "differs" && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2 text-xs"
                    title="Edit values before updating"
                    onClick={() => openEdit(plan)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="h-7 px-2 text-xs"
                    disabled={isSaving || isSaved}
                    onClick={() => handleApplyNew(plan)}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isSaved ? (
                      "Updated"
                    ) : (
                      "New"
                    )}
                  </Button>
                </>
              )}
              {mode === "only_in_db" && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-7 px-2 text-xs"
                  disabled={isDeleting}
                  onClick={() => handleDeletePlan(plan)}
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </Button>
              )}
            </div>
          </td>
        )}
      </tr>
    )
  }

  const inputCls =
    "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex flex-col bg-card rounded-2xl border-2 border-border shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">

        {/* ── Edit form overlay ───────────────────────────────── */}
        {editForm && (
          <div className="absolute inset-0 z-20 flex flex-col bg-card rounded-2xl">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Edit &amp; save plan</h2>
              <Button
                type="button" variant="ghost" size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => { setEditForm(null); setSaveError("") }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form id="edit-plan-form" onSubmit={handleEditSave} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {saveError && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{saveError}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Plan name *</label>
                  <input className={inputCls} value={editForm.plan_name}
                    onChange={(e) => setEditForm((f) => f && { ...f, plan_name: e.target.value })}
                    placeholder="Plan name or model" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Price (USD) *</label>
                  <input className={inputCls} type="number" min={0} value={editForm.price}
                    onChange={(e) => setEditForm((f) => f && { ...f, price: e.target.value })}
                    placeholder="Price" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Sq Ft</label>
                  <input className={inputCls} type="number" min={0} value={editForm.sqft}
                    onChange={(e) => setEditForm((f) => f && { ...f, sqft: e.target.value })}
                    placeholder="Sq Ft" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Company *</label>
                  <input className={inputCls} value={editForm.company}
                    onChange={(e) => setEditForm((f) => f && { ...f, company: e.target.value })}
                    placeholder="Builder / company" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <select className={inputCls} value={editForm.type}
                    onChange={(e) => setEditForm((f) => f && { ...f, type: e.target.value as "plan" | "now" })}>
                    <option value="plan">Floor Plan</option>
                    <option value="now">Spec / Quick move-in</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Beds</label>
                  <input className={inputCls} value={editForm.beds}
                    onChange={(e) => setEditForm((f) => f && { ...f, beds: e.target.value })}
                    placeholder="e.g. 3" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Baths</label>
                  <input className={inputCls} value={editForm.baths}
                    onChange={(e) => setEditForm((f) => f && { ...f, baths: e.target.value })}
                    placeholder="e.g. 2.5" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Address (for spec homes)</label>
                  <input className={inputCls} value={editForm.address}
                    onChange={(e) => setEditForm((f) => f && { ...f, address: e.target.value })}
                    placeholder="Full address" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Community</label>
                  <input className={cn(inputCls, "bg-muted cursor-not-allowed")} value={button.communityName} readOnly />
                </div>
              </div>
            </form>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-muted/20">
              <Button type="button" variant="ghost" size="sm"
                onClick={() => { setEditForm(null); setSaveError("") }}>
                Cancel
              </Button>
              <Button type="submit" form="edit-plan-form" size="sm" disabled={editSaving}>
                {editSaving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</> : "Save to DB"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground leading-tight">
              {button.communityName}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pc
                ? "Live web source compared with MarketMap plans."
                : `${button.plans.length} plan${button.plans.length !== 1 ? "s" : ""} found${
                    filtered.length !== button.plans.length
                      ? ` · ${filtered.length} matching filter`
                      : ""
                  }`}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon"
            className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Search ─────────────────────────────────────────── */}
        <div className="px-6 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input type="text" placeholder="Filter by plan name, company, address…"
              value={filter} onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus />
          </div>
        </div>

        {/* ── Error banner ───────────────────────────────────── */}
        {saveError && !editForm && (
          <div className="px-6 py-2 bg-destructive/10 text-destructive text-xs border-b border-destructive/20">
            {saveError}
          </div>
        )}

        {/* ── Plan rows ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {pc && showComparisonIdle ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              There are currently no data available for additions or changes to the data.
            </p>
          ) : pc && !showComparisonIdle ? (
            <>
              {filter.trim() && !hasAnyFiltered && (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No plans match your filter.
                </p>
              )}
              {hasAnyFiltered && (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card z-10 border-b border-border">
                    <tr>
                      <th className="text-left px-6 py-2 text-xs font-medium text-muted-foreground">Plan</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                        Company
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Price</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                        Sqft
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                        Beds/Baths
                      </th>
                      {canManage && <th className="px-3 py-2" />}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdded.length > 0 && (
                      <>
                        <tr className="bg-muted/50">
                          <td
                            colSpan={colSpan}
                            className="px-6 py-2 text-xs font-semibold text-foreground uppercase tracking-wide"
                          >
                            Newly added data ({filteredAdded.length} item
                            {filteredAdded.length !== 1 ? "s" : ""})
                          </td>
                        </tr>
                        {filteredAdded.map((plan) => renderPlanRow(plan, "add"))}
                      </>
                    )}
                    {filteredDiffers.length > 0 && (
                      <>
                        <tr className="bg-muted/50">
                          <td
                            colSpan={colSpan}
                            className="px-6 py-2 text-xs font-semibold text-foreground uppercase tracking-wide"
                          >
                            Data differing from the existing data (fixing data) ({filteredDiffers.length}{" "}
                            item{filteredDiffers.length !== 1 ? "s" : ""})
                          </td>
                        </tr>
                        {filteredDiffers.map((plan) => renderPlanRow(plan, "differs"))}
                      </>
                    )}
                    {filteredOnlyDb.length > 0 && (
                      <>
                        <tr className="bg-muted/50">
                          <td
                            colSpan={colSpan}
                            className="px-6 py-2 text-xs font-semibold text-foreground uppercase tracking-wide"
                          >
                            Data missing from the new source ({filteredOnlyDb.length} item
                            {filteredOnlyDb.length !== 1 ? "s" : ""})
                          </td>
                        </tr>
                        {filteredOnlyDb.map((plan) => renderPlanRow(plan, "only_in_db"))}
                      </>
                    )}
                  </tbody>
                </table>
              )}
            </>
          ) : filtered.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">No plans match your filter.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10 border-b border-border">
                <tr>
                  <th className="text-left px-6 py-2 text-xs font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Company</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Price</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Sqft</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Beds/Baths</th>
                  {canManage && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((plan: AssistantPlanItem) => renderPlanRow(plan, "legacy"))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
          {!canManage && (
            <span className="flex-1 text-xs text-muted-foreground">View only — contact an Admin for Editor access.</span>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AssistantChatBubble() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "welcome", role: "assistant", content: WELCOME_EDITOR },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)
  const [planModal, setPlanModal] = useState<ShowPlansButton | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (planModal) setPlanModal(null)
        else setOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, planModal])

  useEffect(() => {
    if (!open) return
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [open, messages, isSending])

  const canManageContent =
    user?.role === "admin" || user?.permission === "editor"

  useEffect(() => {
    const text = canManageContent ? WELCOME_EDITOR : WELCOME_VIEWER
    setMessages((prev) =>
      prev.map((m) => (m.id === "welcome" ? { ...m, content: text } : m))
    )
  }, [canManageContent])

  // ── Button click handler ───────────────────────────────────────────────────
  const runAssistantButton = (b: AssistantChatButton) => {
    const canManage = user?.role === "admin" || user?.permission === "editor"
    if (
      !canManage &&
      (b.kind === "add_community" ||
        b.kind === "add_plan" ||
        b.kind === "edit_plan" ||
        b.kind === "delete_plan")
    ) {
      toast({
        title: "View only",
        description: "Editor permission is required to add, edit, or delete plans or communities.",
      })
      return
    }

    if (b.kind === "show_plans") {
      setPlanModal(b)
      return
    }

    const here = slugFromPathname(pathname)
    const targetSlug =
      "communitySlug" in b ? b.communitySlug.toLowerCase() : undefined
    const sameCommunity =
      targetSlug != null && here != null && here === targetSlug

    const closePanel = () => setOpen(false)

    if (b.kind === "add_community") {
      sessionStorage.setItem("assistant:open-add-community", "manual")
      const onCommunities = pathname === "/communities"
      if (onCommunities) {
        window.dispatchEvent(
          new CustomEvent("assistant:open-add-community", { detail: { preferManual: true } })
        )
      } else {
        router.push("/communities")
      }
      closePanel()
      return
    }

    if (b.kind === "go_to_community") {
      if (sameCommunity) {
        toast({ title: "Already here", description: "You're already on this community page." })
        return
      }
      router.push(`/community/${encodeURIComponent(b.communitySlug)}`)
      closePanel()
      return
    }

    if (b.kind === "go_to_community_chart") {
      const parts = pathname?.split("/").filter(Boolean) ?? []
      const onChartPage =
        parts.length >= 3 && parts[0] === "community" && parts[2] === "chart"
      let slugHere: string | null = null
      try {
        slugHere = parts[1] ? decodeURIComponent(parts[1]).toLowerCase() : null
      } catch {
        slugHere = parts[1]?.toLowerCase() ?? null
      }
      const wantType = (b.chartType ?? "now").toLowerCase()
      const typeHere = (
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("type")
          : null
      )?.toLowerCase() ?? "now"
      if (
        onChartPage &&
        slugHere != null &&
        targetSlug != null &&
        slugHere === targetSlug &&
        typeHere === wantType
      ) {
        toast({ title: "Already here", description: "You're already on this chart." })
        return
      }
      router.push(
        `/community/${encodeURIComponent(b.communitySlug)}/chart?type=${encodeURIComponent(wantType)}`
      )
      closePanel()
      return
    }

    if (b.kind === "add_plan") {
      if (sameCommunity) {
        window.dispatchEvent(new CustomEvent("assistant:open-add-plan"))
      } else {
        sessionStorage.setItem(
          "assistant:open-add-plan",
          JSON.stringify({ slug: b.communitySlug })
        )
        router.push(`/community/${encodeURIComponent(b.communitySlug)}`)
      }
      closePanel()
      return
    }

    if (b.kind === "view_plan") {
      if (sameCommunity) {
        window.dispatchEvent(
          new CustomEvent("assistant:view-plan", { detail: { planId: b.planId } })
        )
      } else {
        sessionStorage.setItem(
          "assistant:view-plan",
          JSON.stringify({ slug: b.communitySlug, planId: b.planId })
        )
        router.push(`/community/${encodeURIComponent(b.communitySlug)}`)
      }
      closePanel()
      return
    }

    if (b.kind === "edit_plan") {
      if (sameCommunity) {
        window.dispatchEvent(
          new CustomEvent("assistant:open-edit-plan", { detail: { planId: b.planId } })
        )
      } else {
        sessionStorage.setItem(
          "assistant:open-edit-plan",
          JSON.stringify({ slug: b.communitySlug, planId: b.planId })
        )
        router.push(`/community/${encodeURIComponent(b.communitySlug)}`)
      }
      closePanel()
      return
    }

    if (b.kind === "delete_plan") {
      if (sameCommunity) {
        window.dispatchEvent(
          new CustomEvent("assistant:open-delete-plan", { detail: { planId: b.planId } })
        )
      } else {
        sessionStorage.setItem(
          "assistant:open-delete-plan",
          JSON.stringify({ slug: b.communitySlug, planId: b.planId })
        )
        router.push(`/community/${encodeURIComponent(b.communitySlug)}`)
      }
      closePanel()
    }
  }

  if (!pathname || publicRoutes.includes(pathname)) return null
  if (user?.status === "pending") return null

  const send = async () => {
    const text = draft.trim()
    if (!text || isSending) return

    const userMsg: ChatMessage = { id: newId(), role: "user", content: text }
    setDraft("")
    setMessages((prev) => [...prev, userMsg])
    setIsSending(true)

    const payloadMessages = [...messages, userMsg].map(({ role, content }) => ({ role, content }))

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: payloadMessages,
          pathname: pathname || null,
          clientCapabilities: user
            ? {
                permission: user.permission ?? "viewer",
                role: user.role ?? "user",
              }
            : undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Could not get a reply. Try again."
        toast({
          variant: "destructive",
          title: "Assistant error",
          description: msg,
        })
        return
      }

      const reply = typeof data.reply === "string" ? data.reply : ""
      if (!reply) {
        toast({
          variant: "destructive",
          title: "Assistant error",
          description: "Empty reply from assistant.",
        })
        return
      }

      const rawButtons = data.buttons
      let buttons: AssistantChatButton[] | undefined
      if (Array.isArray(rawButtons)) {
        buttons = rawButtons.filter((x: unknown) => x && typeof x === "object" && "kind" in (x as object)) as AssistantChatButton[]
        if (buttons.length === 0) buttons = undefined
      }

      setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: reply, buttons }])
    } catch {
      toast({
        variant: "destructive",
        title: "Network error",
        description: "Check your connection and try again.",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <div
        className="fixed bottom-6 right-4 z-[100] flex flex-col items-end gap-3 md:right-6"
        aria-live="polite"
      >
        {open && (
          <div
            id="assistant-chat-panel"
            className="flex min-h-0 max-h-[min(420px,70vh)] w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-xl border-2 border-border bg-card text-card-foreground shadow-2xl"
          >
            <Card className="flex min-h-0 max-h-full flex-1 flex-col border-0 bg-transparent shadow-none">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b border-border pb-4 pt-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"
                    aria-hidden
                  >
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold leading-tight text-foreground">Help</p>
                      {user && (
                        <Badge
                          variant={canManageContent ? "secondary" : "outline"}
                          className="text-[10px] font-semibold uppercase tracking-wide"
                        >
                          {canManageContent ? "Editor" : "View only"}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Shortcuts and steps for MarketMap Homes
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setOpen(false)}
                  aria-label="Close help panel"
                >
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent
                ref={scrollRef}
                className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 pb-4 pt-2"
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-lg border p-3 text-sm leading-relaxed",
                      m.role === "assistant"
                        ? "border-border/80 bg-muted/40 text-foreground"
                        : "ml-4 border-primary/30 bg-primary/10 text-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap text-foreground">{m.content}</p>
                    {m.role === "assistant" && m.buttons && m.buttons.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.buttons.map((btn, i) => (
                          <Button
                            key={`${m.id}-btn-${i}`}
                            type="button"
                            size="sm"
                            variant={btn.kind === "delete_plan" ? "destructive" : "secondary"}
                            className="h-auto min-h-9 gap-1.5 whitespace-normal py-2 text-left font-medium"
                            onClick={() => runAssistantButton(btn)}
                          >
                            {(btn.kind === "add_community" || btn.kind === "add_plan") && (
                              <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            )}
                            {btn.kind === "edit_plan" && (
                              <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            )}
                            {btn.kind === "delete_plan" && (
                              <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            )}
                            {btn.kind === "go_to_community" && (
                              <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            )}
                            {btn.kind === "go_to_community_chart" && (
                              <LineChart className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            )}
                            {btn.kind === "view_plan" && (
                              <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            )}
                            {btn.kind === "show_plans" && (
                              <List className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            )}
                            <span>{btn.label}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isSending && (
                  <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    <span>Loading…</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2 border-t border-border bg-muted/20 px-6 py-4">
                <form
                  className="flex w-full gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void send()
                  }}
                >
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        void send()
                      }
                    }}
                    placeholder="Ask a question…"
                    disabled={isSending}
                    rows={2}
                    maxLength={4000}
                    className="flex min-h-[3rem] flex-1 resize-none rounded-lg border-2 border-input bg-background/80 px-4 py-3 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Message"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-12 w-12 flex-shrink-0 self-end"
                    disabled={isSending || !draft.trim()}
                    aria-label="Send message"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Send className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                </form>
                <p className="text-center text-[11px] text-muted-foreground">
                  Use the buttons above to open screens; confirm changes in the dialogs.
                </p>
              </CardFooter>
            </Card>
          </div>
        )}

        <Button
          type="button"
          onClick={() => setOpen((v) => !v)}
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg ring-offset-background transition-transform hover:scale-105 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            open && "ring-2 ring-primary/40"
          )}
          aria-expanded={open}
          aria-controls={open ? "assistant-chat-panel" : undefined}
          id="assistant-chat-launcher"
        >
          <span className="sr-only">{open ? "Close help panel" : "Open help panel"}</span>
          {open ? <X className="h-7 w-7" aria-hidden /> : <MessageCircle className="h-7 w-7" aria-hidden />}
        </Button>
      </div>

      {/* Plan list modal — rendered via portal to avoid z-index stacking issues */}
      {mounted && planModal &&
        createPortal(
          <PlanListModal
            button={planModal}
            canManage={canManageContent}
            onClose={() => setPlanModal(null)}
          />,
          document.body
        )}
    </>
  )
}

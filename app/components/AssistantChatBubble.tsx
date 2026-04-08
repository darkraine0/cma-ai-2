"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2, MessageCircle, Pencil, Plus, Send, Trash2, X } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/app/components/ui/card"
import { useAuth } from "@/app/contexts/AuthContext"
import { useToast } from "@/app/components/ui/use-toast"
import { cn } from "@/app/utils/utils"
import type { AssistantChatButton } from "@/app/lib/assistantChatTypes"

const publicRoutes = ["/signin", "/signup", "/forgot-password", "/reset-password", "/verify-email"]

const WELCOME =
  "Use the shortcuts below when they appear, or type what you want to do. Buttons open the right screen (Add Community, go to a community, add/edit/delete a plan). Nothing changes until you click a button."

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  buttons?: AssistantChatButton[]
}

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

export default function AssistantChatBubble() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "welcome", role: "assistant", content: WELCOME },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [open, messages, isSending])

  const runAssistantButton = (b: AssistantChatButton) => {
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
        toast({ title: "Already here", description: "You’re already on this community page." })
        return
      }
      router.push(`/community/${encodeURIComponent(b.communitySlug)}`)
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
                  <p className="text-sm font-semibold leading-tight text-foreground">Help</p>
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
                          {btn.kind === "add_community" || btn.kind === "add_plan" ? (
                            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          ) : null}
                          {btn.kind === "edit_plan" ? (
                            <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          ) : null}
                          {btn.kind === "delete_plan" ? (
                            <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          ) : null}
                          {btn.kind === "go_to_community" ? (
                            <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          ) : null}
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
  )
}

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import connectDB from '@/app/lib/mongodb';
import { getCurrentUserFromRequest } from '@/app/lib/auth';
import { requireApproved } from '@/app/lib/admin';
import AssistantInteraction from '@/app/models/AssistantInteraction';
import {
  dedupeButtons,
  executeAssistantTool,
  getAssistantToolsForUser,
  type AssistantToolContext,
} from '@/app/lib/assistantTools';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = 'gpt-4o-mini';

const MAX_MESSAGES = 24;
const MAX_CONTENT_CHARS = 4000;
const MAX_TOOL_ROUNDS = 8;

const BASE_SYSTEM = `You are the in-app assistant for MarketMap Homes (CMA), used by UnionMain Homes teams.

Behavior:
- Use tools to search communities and plans (real database data).
- For finding a plan or spec by address, street, or name, use find_plans_by_text first. Spec (quick move-in) rows often store the street in the address field, not plan_name â€” find_plans_by_text searches both.
- When the current page path is a community page, find_plans_by_text automatically limits results to that community unless the user asks to search all communities (then set search_all_communities true).
- search_plans lists plans for a known MongoDB community id; it matches plan_name OR address.
- Use navigate_to_community to add an "Open [community]" button â€” you never redirect the user automatically.
- Use navigate_to_community_chart when the user wants the price chart / graph / MarketMap chart for a community (optional chart_type: now vs plan).
- Use suggest_add_community ONLY when the user wants to create a brand-new community (subdivision) in MarketMap â€” shows "Add new community". Do NOT use it when the user wants to add a plan, spec, or home to an existing community â€” that is open_plan_ui_workflow with action add (shows "Add plan in [Community]").
- Use open_plan_ui_workflow for add/edit/delete plan or spec. For "add plan/spec to [Community]", use action add with community_name_or_query = that community (or the user sentence).
- If the user provides concrete plan details and explicitly wants you to add/create it now, use create_plan_from_prompt to create the plan record directly.
- find_plans_by_text and search_plans add shortcut buttons for matching plans (up to 3): Editors get View, Edit, Delete; Viewers get View only.
- Use analyze_community_changes whenever the user wants to see, list, show, browse, analyze, or review plans for a community. It performs a live web search for current floor plans and quick move-ins (spec homes) from all builders in that US community, then shows a button that opens an in-chat modal. When the community exists in MarketMap, the modal compares that live source to stored plans (new rows, differing rows, and DB-only rows). Examples: "show plans for Elevon" → analyze_community_changes(community_name_or_query="Elevon"); "what plans are available in Cambridge Crossing" → analyze_community_changes(community_name_or_query="Cambridge Crossing").

Rules:
- Do not invent names, prices, or counts; use tools or say no match was found.
- Keep the reply concise. Mention that users can use the buttons below your message when tools add them.
- Editors can add/edit/delete plans and communities (where applicable); Viewers can only search and view.

Critical â€” no fake Markdown links:
- Never write [text](#) or other Markdown links for navigation. Use navigate_to_community / navigate_to_community_chart so real buttons appear.`;

const VIEWER_PERMISSION_BLOCK = `

=== SIGNED-IN USER: VIEWER (read-only) ===
This user has Viewer permission. They can search and open communities, companies, plans, and charts only.
They cannot add, edit, or delete communities, plans, or companies. Do not describe "Add community" or edit/delete flows as available to them.
If they ask how to add/create/edit/delete/update/remove data, explain they are view-only and can contact an Admin for Editor access.`;

function stripMarkdownLinksToPlainLabels(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function ensureCommunityNavigateButtonFromReply(
  reply: string,
  lastUserMessage: string,
  ctx: AssistantToolContext
) {
  const hasNav = ctx.buttons.some(
    (b) => b.kind === 'go_to_community' || b.kind === 'go_to_community_chart'
  );
  if (hasNav) return;
  if (!/\[[^\]]+\]\([^)]*\)/.test(reply)) return;

  let query: string | null = null;
  const openLabel = reply.match(/\[\s*Open\s+([^\]]+?)\s*\]\s*\([^)]*\)/i);
  if (openLabel?.[1]) query = openLabel[1].trim();
  else {
    const anyLink = reply.match(/\[([^\]]+)\]\([^)]*\)/);
    if (anyLink?.[1]) {
      const raw = anyLink[1].trim();
      query = raw.replace(/^open\s+/i, '').trim() || raw;
    }
  }
  if (!query) {
    const u = lastUserMessage.trim();
    if (u.length >= 2 && u.length <= 120) query = u;
  }
  if (!query || query.length < 2) return;

  await executeAssistantTool(
    'navigate_to_community',
    JSON.stringify({ community_name_or_query: query }),
    ctx
  );
}

type AssistantCapabilities = {
  role: 'admin' | 'user';
  permission: 'viewer' | 'editor';
  canManagePlans: boolean;
};

function capabilitiesFromDbUser(user: {
  role?: string;
  permission?: string;
}): AssistantCapabilities {
  const role = user.role === 'admin' ? 'admin' : 'user';
  const permission = user.permission === 'editor' ? 'editor' : 'viewer';
  const canManagePlans = user.role === 'admin' || user.permission === 'editor';
  return { role, permission, canManagePlans };
}

type ChatRole = 'user' | 'assistant';

type IncomingMessage = { role: ChatRole; content: string };

function normalizeMessages(raw: unknown): IncomingMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: IncomingMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const role = (item as IncomingMessage).role;
    const content = (item as IncomingMessage).content;
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string') return null;
    const trimmed = content.trim();
    if (!trimmed) return null;
    if (trimmed.length > MAX_CONTENT_CHARS) return null;
    out.push({ role, content: trimmed });
  }
  if (out.length === 0) return null;
  if (out[out.length - 1].role !== 'user') return null;
  return out.slice(-MAX_MESSAGES);
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const tokenPayload = getCurrentUserFromRequest(request);
    if (!tokenPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const approved = await requireApproved(request);
    if (approved instanceof NextResponse) {
      return approved;
    }

    const body = await request.json();
    const pathname =
      typeof body.pathname === 'string' ? body.pathname.slice(0, 512) : null;
    const clientCapabilities = body.clientCapabilities as
      | { permission?: string; role?: string }
      | undefined;
    const messages = normalizeMessages(body.messages);
    if (!messages) {
      return NextResponse.json(
        { error: 'Invalid messages: non-empty array required, last message must be from the user' },
        { status: 400 }
      );
    }

    const pathLine = pathname
      ? `\nCurrent page path (for context): ${pathname}`
      : '';

    const capabilities = capabilitiesFromDbUser(approved.user);
    if (
      process.env.NODE_ENV === 'development' &&
      clientCapabilities?.permission &&
      clientCapabilities.permission !== capabilities.permission
    ) {
      console.warn('[assistant/chat] clientCapabilities.permission does not match database', {
        client: clientCapabilities.permission,
        database: capabilities.permission,
      });
    }

    const canManagePlans = capabilities.canManagePlans;
    const messagesForModel: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `${BASE_SYSTEM}${canManagePlans ? '' : VIEWER_PERMISSION_BLOCK}${pathLine}`,
      },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const lastUserMessage = messages[messages.length - 1].content;
    const toolCtx: AssistantToolContext = {
      buttons: [],
      pathname,
      userMessage: lastUserMessage,
      canManagePlans,
    };
    let assistantReply = '';
    let rounds = 0;

    while (rounds < MAX_TOOL_ROUNDS) {
      rounds += 1;
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: messagesForModel,
        tools: getAssistantToolsForUser(canManagePlans),
        tool_choice: 'auto',
        temperature: canManagePlans ? 0.45 : 0.25,
        max_tokens: 2000,
      });

      const choice = completion.choices[0]?.message;
      if (!choice) break;

      if (choice.tool_calls?.length) {
        messagesForModel.push(choice);
        for (const tc of choice.tool_calls) {
          if (tc.type !== 'function') continue;
          const name = tc.function.name;
          const args = tc.function.arguments ?? '{}';
          const result = await executeAssistantTool(name, args, toolCtx);
          messagesForModel.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: result,
          });
        }
        continue;
      }

      const text = choice.content?.trim();
      if (text) {
        assistantReply = text;
        break;
      }
      break;
    }

    if (!assistantReply) {
      assistantReply =
        'I could not complete that request. Try rephrasing or being more specific.';
    }

    await ensureCommunityNavigateButtonFromReply(assistantReply, lastUserMessage, toolCtx);
    assistantReply = stripMarkdownLinksToPlainLabels(assistantReply);

    const buttons = dedupeButtons(toolCtx.buttons);

    void (async () => {
      try {
        await connectDB();
        await AssistantInteraction.create({
          userId: tokenPayload.userId,
          pathname,
          userMessage: lastUserMessage,
          assistantReply,
          openaiModel: MODEL,
        });
      } catch (e) {
        console.error('AssistantInteraction log failed:', e);
      }
    })();

    return NextResponse.json(
      { reply: assistantReply, buttons, capabilities },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: { error?: { message?: string } } } };
    console.error('Assistant chat error:', error);
    const message =
      err.response?.data?.error?.message || err.message || 'Assistant request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

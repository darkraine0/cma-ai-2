import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import connectDB from '@/app/lib/mongodb';
import { getCurrentUserFromRequest } from '@/app/lib/auth';
import { requireApproved } from '@/app/lib/admin';
import AssistantInteraction from '@/app/models/AssistantInteraction';
import {
  ASSISTANT_TOOLS,
  dedupeButtons,
  executeAssistantTool,
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
- For finding a plan or spec by address, street, or name, use find_plans_by_text first. Spec (quick move-in) rows often store the street in the address field, not plan_name — find_plans_by_text searches both.
- When the current page path is a community page, find_plans_by_text automatically limits results to that community unless the user asks to search all communities (then set search_all_communities true).
- search_plans lists plans for a known MongoDB community id; it matches plan_name OR address.
- Use navigate_to_community to add an "Open [community]" button — you never redirect the user automatically.
- Use navigate_to_community_chart when the user wants the price chart / graph / MarketMap chart for a community (optional chart_type: now vs plan).
- Use suggest_add_community ONLY when the user wants to create a brand-new community (subdivision) in MarketMap — shows "Add new community". Do NOT use it when the user wants to add a plan, spec, or home to an existing community — that is open_plan_ui_workflow with action add (shows "Add plan in [Community]").
- Use open_plan_ui_workflow for add/edit/delete plan or spec. For "add plan/spec to [Community]", use action add with community_name_or_query = that community (or the user sentence).
- find_plans_by_text and search_plans automatically add View, Edit, and Delete buttons under the reply when they return matching plans (up to 3 plans). If the user asked to find/show a specific plan, direct them to click View to open that plan in its community.

Rules:
- Do not invent names, prices, or counts; use tools or say no match was found.
- Keep the reply concise. Mention that users can use the buttons below your message when tools add them.
- Editors can add/edit/delete plans in the UI; viewers may only browse.`;

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

    const messagesForModel: ChatCompletionMessageParam[] = [
      { role: 'system', content: `${BASE_SYSTEM}${pathLine}` },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const lastUserMessage = messages[messages.length - 1].content;
    const toolCtx: AssistantToolContext = {
      buttons: [],
      pathname,
      userMessage: lastUserMessage,
    };
    let assistantReply = '';
    let rounds = 0;

    while (rounds < MAX_TOOL_ROUNDS) {
      rounds += 1;
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: messagesForModel,
        tools: ASSISTANT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.45,
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

    return NextResponse.json({ reply: assistantReply, buttons }, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: { error?: { message?: string } } } };
    console.error('Assistant chat error:', error);
    const message =
      err.response?.data?.error?.message || err.message || 'Assistant request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

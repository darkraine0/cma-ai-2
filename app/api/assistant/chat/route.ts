import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import connectDB from '@/app/lib/mongodb';
import { getCurrentUserFromRequest } from '@/app/lib/auth';
import AssistantInteraction from '@/app/models/AssistantInteraction';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = 'gpt-4o-mini';

const MAX_MESSAGES = 24;
const MAX_CONTENT_CHARS = 4000;

const SYSTEM_PROMPT = `You are the in-app assistant for MarketMap Homes (CMA), used by UnionMain Homes teams to explore residential communities, home plans, builders, and pricing.

Your role:
- Help users navigate the app: Communities list, Companies, Manage/admin tasks, community detail pages, charts, and related workflows.
- Answer "how do I" questions with clear, short steps.
- When the user is stuck, ask a brief clarifying question if needed.
- Do not invent specific community names, prices, plan counts, or availability—only explain how to find or enter that information in the tool.
- If something requires admin access, email verification, or an approval workflow, say so plainly.

Keep replies concise and scannable. Use short paragraphs or bullet points for multi-step instructions.`;

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

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.6,
      max_tokens: 1200,
    });

    const assistantReply = completion.choices[0]?.message?.content?.trim();
    if (!assistantReply) {
      return NextResponse.json(
        { error: 'No reply from assistant' },
        { status: 500 }
      );
    }

    const lastUser = messages[messages.length - 1].content;

    void (async () => {
      try {
        await connectDB();
        await AssistantInteraction.create({
          userId: tokenPayload.userId,
          pathname,
          userMessage: lastUser,
          assistantReply,
          openaiModel: MODEL,
        });
      } catch (e) {
        console.error('AssistantInteraction log failed:', e);
      }
    })();

    return NextResponse.json({ reply: assistantReply }, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: { error?: { message?: string } } } };
    console.error('Assistant chat error:', error);
    const message =
      err.response?.data?.error?.message || err.message || 'Assistant request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

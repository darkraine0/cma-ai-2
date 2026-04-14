import mongoose from 'mongoose';
import OpenAI from 'openai';
import Community from '@/app/models/Community';
import Plan from '@/app/models/Plan';
import Company from '@/app/models/Company';
import { communityNameToSlug } from '@/app/community/utils/formatCommunityName';
import type { AssistantChatButton, AssistantPlanItem } from '@/app/lib/assistantChatTypes';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export type AssistantToolContext = {
  buttons: AssistantChatButton[];
  /** Current app path (e.g. /community/cambridge-crossing) to scope plan search. */
  pathname?: string | null;
  /** Last user message (for correcting wrong tool choice). */
  userMessage?: string | null;
  /** True for admin/editor users; required for mutating tools. */
  canManagePlans?: boolean;
};

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeCommunityQuery(q: string): string {
  return q
    .trim()
    .replace(/[.,!?:;]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function communityNameCandidates(raw: string): string[] {
  const normalized = normalizeCommunityQuery(raw);
  if (!normalized) return [];
  const out: string[] = [];
  const toPhrase = normalized.match(/\b(?:to|in|at|for)\s+(.+)$/i);
  if (toPhrase?.[1]) out.push(normalizeCommunityQuery(toPhrase[1]));
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words[0]?.toLowerCase() === 'the' && words.length >= 2) {
    out.push(words.slice(1).join(' '));
  }
  for (let n = 2; n <= Math.min(5, words.length); n++) {
    out.push(words.slice(-n).join(' '));
  }
  out.push(normalized);
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const s of out) {
    const t = normalizeCommunityQuery(s);
    if (t.length < 2 || seen.has(t)) continue;
    seen.add(t);
    uniq.push(t);
  }
  return uniq;
}

async function findCommunitiesByNameSearch(rawQuery: string, limit = 12) {
  const candidates = communityNameCandidates(rawQuery);
  for (const q of candidates) {
    const re = new RegExp(escapeRegex(q), 'i');
    const slugFromQ = communityNameToSlug(q);
    const orConditions: Record<string, unknown>[] = [{ name: re }];
    if (slugFromQ) {
      orConditions.push({ slug: slugFromQ });
      orConditions.push({ slug: new RegExp(`^${escapeRegex(slugFromQ)}$`, 'i') });
    }
    let list = await Community.find({ $or: orConditions }).limit(limit).lean();
    if (list.length > 0) return list;
    const words = q.split(/\s+/).filter((w) => w.length >= 2 || /\d/.test(w));
    if (words.length >= 2) {
      list = await Community.find({
        $and: words.map((w) => ({ name: { $regex: escapeRegex(w), $options: 'i' } })),
      })
        .limit(limit)
        .lean();
      if (list.length > 0) return list;
    }
  }
  return [];
}

/** User asked to add a plan/spec (not a new community). */
function userIntendsAddPlanOrSpec(message: string): boolean {
  const m = message.toLowerCase();
  const hasPlanSpec =
    /\b(plan|spec|plans|specs|quick\s*move|inventory)\b/.test(m) ||
    /plan\s*\/\s*spec/.test(m);
  const hasAddIntent = /\b(add|adding|new|create|going to add)\b/.test(m);
  if (!hasPlanSpec || !hasAddIntent) return false;
  if (/\b(add|new|create)\s+(a\s+)?(new\s+)?community\b|\bnew\s+community\b/.test(m)) {
    return false;
  }
  return true;
}

/** First path segment after /community/ (e.g. cambridge-crossing). */
function communitySlugFromPath(pathname: string | null | undefined): string | null {
  if (!pathname?.startsWith('/community/')) return null;
  const rest = pathname.slice('/community/'.length);
  const seg = rest.split('/').filter(Boolean)[0];
  if (!seg) return null;
  try {
    return decodeURIComponent(seg).toLowerCase();
  } catch {
    return seg.toLowerCase();
  }
}

type LeanCommunityIdName = { _id: mongoose.Types.ObjectId; name: string };

function leanCommunity(doc: unknown): LeanCommunityIdName | null {
  if (!doc || typeof doc !== 'object' || !('_id' in doc)) return null;
  const o = doc as { _id: mongoose.Types.ObjectId; name?: string };
  if (!o.name) return null;
  return { _id: o._id, name: o.name };
}

/** Resolve Community from URL slug (slug field or name derived slug). */
async function findCommunityByUrlSlug(slug: string) {
  let doc = leanCommunity(await Community.findOne({ slug }).select('_id name').lean());
  if (!doc) {
    doc = leanCommunity(
      await Community.findOne({
        slug: new RegExp(`^${escapeRegex(slug)}$`, 'i'),
      })
        .select('_id name')
        .lean()
    );
  }
  if (doc) {
    return { id: doc._id, name: doc.name };
  }
  const words = slug.split('-').filter(Boolean);
  if (words.length === 0) return null;
  const nameRe = new RegExp(`^${words.map((w) => escapeRegex(w)).join('\\s+')}$`, 'i');
  const byName = leanCommunity(await Community.findOne({ name: nameRe }).select('_id name').lean());
  if (byName) {
    return { id: byName._id, name: byName.name };
  }
  const loose = new RegExp(words.map((w) => escapeRegex(w)).join('.*'), 'i');
  const byLoose = leanCommunity(await Community.findOne({ name: loose }).select('_id name').lean());
  if (byLoose) {
    return { id: byLoose._id, name: byLoose.name };
  }
  return null;
}

/** Match user text against plan_name OR address (specs often store street in address). */
function buildPlanTextOrMatch(query: string): Record<string, unknown> | null {
  const q = query.trim();
  if (!q) return null;
  const escaped = escapeRegex(q);
  return {
    $or: [
      { plan_name: { $regex: escaped, $options: 'i' } },
      { address: { $regex: escaped, $options: 'i' } },
    ],
  };
}

/** If full-string match fails, require each token in plan_name or address (helps typos / punctuation). */
function buildPlanTokenAndMatch(query: string): Record<string, unknown> | null {
  const tokens = query
    .split(/[\s,]+/)
    .map((t) => t.replace(/\.+$/g, '').trim())
    .filter((t) => t.length >= 2 || /^\d/.test(t));
  if (tokens.length < 2) return null;
  const slice = tokens.slice(0, 10);
  return {
    $and: slice.map((t) => ({
      $or: [
        { plan_name: { $regex: escapeRegex(t), $options: 'i' } },
        { address: { $regex: escapeRegex(t), $options: 'i' } },
      ],
    })),
  };
}

function dedupeButtons(buttons: AssistantChatButton[]): AssistantChatButton[] {
  const seen = new Set<string>();
  const out: AssistantChatButton[] = [];
  for (const b of buttons) {
    const key = JSON.stringify(b);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out.slice(0, 9);
}

/** Label shown in table for a plan/spec row (matches PlansTable). */
function planButtonLabel(p: {
  plan_name?: string;
  address?: string | null;
  type?: string;
}): string {
  const raw =
    p.type === 'now' && p.address?.trim()
      ? p.address.trim()
      : (p.plan_name ?? '').trim();
  return raw || 'plan';
}

/**
 * When search tools return matching plans, register View (and for editors, Edit/Delete) chips.
 */
function pushPlanActionButtonsForFoundPlans(
  plans: Array<{
    _id: unknown;
    plan_name?: string;
    address?: string | null;
    type?: string;
    community?: { name?: string } | null;
  }>,
  ctx: AssistantToolContext,
  maxPlans = 3
) {
  const slice = plans.slice(0, maxPlans);
  const canEdit = Boolean(ctx.canManagePlans);
  for (const p of slice) {
    const planId = String(p._id);
    if (!mongoose.Types.ObjectId.isValid(planId)) continue;
    const cname = p.community?.name?.trim();
    if (!cname) continue;
    const slug = communityNameToSlug(cname);
    const labelBase = planButtonLabel(p);
    ctx.buttons.push({
      kind: 'view_plan',
      label: `View ${labelBase}`,
      communitySlug: slug,
      planId,
    });
    if (canEdit) {
      ctx.buttons.push({
        kind: 'edit_plan',
        label: `Edit ${labelBase}`,
        communitySlug: slug,
        planId,
      });
      ctx.buttons.push({
        kind: 'delete_plan',
        label: `Delete ${labelBase}`,
        communitySlug: slug,
        planId,
      });
    }
  }
}

export { dedupeButtons };

export const ASSISTANT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_communities',
      description:
        'Find communities in the database by name or partial name.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to_community',
      description:
        'Offer a button to open a community page (no automatic navigation). Resolves best name match.',
      parameters: {
        type: 'object',
        properties: {
          community_name_or_query: { type: 'string' },
        },
        required: ['community_name_or_query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to_community_chart',
      description:
        'Offer a button to open the price analysis chart page for a community (Now vs Plan pricing). Use when the user asks for the chart, price chart, graph, or MarketMap chart for a subdivision.',
      parameters: {
        type: 'object',
        properties: {
          community_name_or_query: { type: 'string' },
          chart_type: {
            type: 'string',
            enum: ['now', 'plan'],
            description:
              'Optional. now = current/spec pricing; plan = base plan pricing. Default now.',
          },
        },
        required: ['community_name_or_query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_plans',
      description:
        'List plans/specs for one community by MongoDB community id. Filters by plan name OR street address (spec homes).',
      parameters: {
        type: 'object',
        properties: {
          community_id: { type: 'string' },
          plan_name_query: { type: 'string' },
        },
        required: ['community_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_plans_by_text',
      description:
        'Find plans and quick-move-in specs by address, plan name, or keywords. Searches both plan_name and address (spec rows often store the street in address). Prefer this when the user pastes an address or asks to find a plan/spec by name. If the user is on a community page, results are limited to that community unless they ask to search everywhere. Optional community_name_or_slug narrows the search.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Street address, plan name, or distinctive words (e.g. 1824 Coventry Dr).',
          },
          community_name_or_slug: {
            type: 'string',
            description:
              'Optional: limit to this community (display name or URL slug like cambridge-crossing).',
          },
          search_all_communities: {
            type: 'boolean',
            description:
              'Set true only if the user wants a global search with no community scope. Default false.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_community_changes',
      description:
        'Search the web for current home plans and quick move-ins (spec homes) in a US community and show them in an in-chat modal. Use whenever the user asks to see, list, show, browse, analyze, or review plans for a community. Returns live data via web search — not the internal database.',
      parameters: {
        type: 'object',
        properties: {
          community_name_or_query: {
            type: 'string',
            description:
              'Community name or descriptive query (e.g. "Elevon", "Cambridge Crossing"). If omitted and the user is on a community page the current community is used.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_add_community',
      description:
        'ONLY when the user wants to create a brand-new community (subdivision) in MarketMap. NEVER use for adding a plan, spec, or home to an existing community â€” use open_plan_ui_workflow with action add instead.',
      parameters: {
        type: 'object',
        properties: {
          _noop: {
            type: 'string',
            description: 'Optional; leave empty.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_plan_ui_workflow',
      description:
        'Register buttons to add, edit, or delete a plan or spec in the UI. For action add: user wants a new plan/spec inside an existing community â€” pass community_name_or_query (community name or full sentence).',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'edit', 'delete'] },
          community_name_or_query: {
            type: 'string',
            description:
              'Required for action add: which community to add the plan/spec to (e.g. Echo Park). Full sentences are OK.',
          },
          plan_id: { type: 'string' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_plan_from_prompt',
      description:
        'Create a new plan/spec in MarketMap from user-provided details. Use only when the user explicitly asks to add/create a plan/spec/home entry. Requires community_name_or_query, plan_name, price, and company_name.',
      parameters: {
        type: 'object',
        properties: {
          community_name_or_query: { type: 'string' },
          plan_name: { type: 'string' },
          company_name: { type: 'string' },
          price: { type: 'number' },
          type: { type: 'string', enum: ['plan', 'now'] },
          address: { type: 'string' },
          sqft: { type: 'number' },
          stories: { type: 'string' },
          beds: { type: 'string' },
          baths: { type: 'string' },
          design_number: { type: 'string' },
        },
        required: ['community_name_or_query', 'plan_name', 'company_name', 'price'],
      },
    },
  },
];

const MUTATING_ASSISTANT_TOOL_NAMES = new Set([
  'suggest_add_community',
  'open_plan_ui_workflow',
  'create_plan_from_prompt',
]);

/** Editors get full tools; Viewers get search/navigation only (no add/edit/delete workflows). */
export function getAssistantToolsForUser(canManagePlans: boolean): ChatCompletionTool[] {
  if (canManagePlans) return ASSISTANT_TOOLS;
  return ASSISTANT_TOOLS.filter(
    (t) =>
      t.type === 'function' &&
      !MUTATING_ASSISTANT_TOOL_NAMES.has(t.function.name)
  );
}

export async function executeAssistantTool(
  name: string,
  rawArgs: string,
  ctx: AssistantToolContext
): Promise<string> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(rawArgs || '{}') as Record<string, unknown>;
  } catch {
    return JSON.stringify({ error: 'Invalid tool arguments JSON' });
  }

  const { default: connectDB } = await import('@/app/lib/mongodb');
  await connectDB();

  switch (name) {
    case 'search_communities': {
      const query = typeof args.query === 'string' ? args.query.trim() : '';
      if (!query) return JSON.stringify({ error: 'query is required' });
      const communities = await findCommunitiesByNameSearch(query, 12);
      return JSON.stringify({
        communities: communities.map((c) => ({
          id: String(c._id),
          name: c.name,
          slug: communityNameToSlug(c.name),
        })),
        count: communities.length,
      });
    }

    case 'navigate_to_community': {
      const q =
        typeof args.community_name_or_query === 'string' ? args.community_name_or_query.trim() : '';
      if (!q) return JSON.stringify({ error: 'community_name_or_query is required' });
      const list = await findCommunitiesByNameSearch(q, 8);
      if (list.length === 0) {
        return JSON.stringify({ error: 'No matching community found' });
      }
      const candSet = new Set(communityNameCandidates(q).map((s) => s.toLowerCase()));
      const exact =
        list.find(
          (c) =>
            candSet.has(c.name.toLowerCase()) ||
            (c.slug && candSet.has(String(c.slug).toLowerCase()))
        ) || list[0];
      const best = exact;
      const slug = communityNameToSlug(best.name);
      ctx.buttons.push({
        kind: 'go_to_community',
        label: `Open ${best.name}`,
        communitySlug: slug,
      });
      return JSON.stringify({
        success: true,
        community: { id: String(best._id), name: best.name, slug },
        buttonAdded: true,
      });
    }

    case 'navigate_to_community_chart': {
      const q =
        typeof args.community_name_or_query === 'string' ? args.community_name_or_query.trim() : '';
      if (!q) return JSON.stringify({ error: 'community_name_or_query is required' });
      const rawType = typeof args.chart_type === 'string' ? args.chart_type.trim().toLowerCase() : '';
      const chartType: 'now' | 'plan' = rawType === 'plan' ? 'plan' : 'now';
      const list = await findCommunitiesByNameSearch(q, 8);
      if (list.length === 0) {
        return JSON.stringify({ error: 'No matching community found' });
      }
      const candSet = new Set(communityNameCandidates(q).map((s) => s.toLowerCase()));
      const exact =
        list.find(
          (c) =>
            candSet.has(c.name.toLowerCase()) ||
            (c.slug && candSet.has(String(c.slug).toLowerCase()))
        ) || list[0];
      const best = exact;
      const slug = communityNameToSlug(best.name);
      const typeLabel = chartType === 'plan' ? 'Plan' : 'Now';
      ctx.buttons.push({
        kind: 'go_to_community_chart',
        label: `Open ${typeLabel} chart â€” ${best.name}`,
        communitySlug: slug,
        chartType,
      });
      return JSON.stringify({
        success: true,
        community: { id: String(best._id), name: best.name, slug },
        chart_type: chartType,
        buttonAdded: true,
      });
    }

    case 'search_plans': {
      const communityId = typeof args.community_id === 'string' ? args.community_id.trim() : '';
      if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
        return JSON.stringify({ error: 'Valid community_id is required' });
      }
      const oid = new mongoose.Types.ObjectId(communityId);
      const pnq = typeof args.plan_name_query === 'string' ? args.plan_name_query.trim() : '';
      const parts: Record<string, unknown>[] = [
        { 'community._id': oid },
        { plan_name: { $exists: true, $ne: null } },
        { price: { $exists: true, $ne: null } },
        { 'company.name': { $exists: true, $ne: null } },
        { 'community.name': { $exists: true, $ne: null } },
      ];
      if (pnq) {
        parts.push({
          $or: [
            { plan_name: { $regex: escapeRegex(pnq), $options: 'i' } },
            { address: { $regex: escapeRegex(pnq), $options: 'i' } },
          ],
        });
      }
      const filter = { $and: parts };
      const plans = await Plan.find(filter).sort({ last_updated: -1 }).limit(40).lean();
      if (plans.length > 0) {
        pushPlanActionButtonsForFoundPlans(plans, ctx);
      }
      return JSON.stringify({
        plans: plans.map((p) => ({
          id: String(p._id),
          plan_name: p.plan_name,
          address: p.address ?? null,
          display_label: p.type === 'now' && p.address ? p.address : p.plan_name,
          price: p.price,
          company: p.company?.name,
          type: p.type,
        })),
        count: plans.length,
        ui_buttons_added:
          plans.length > 0
            ? ctx.canManagePlans
              ? 'View, Edit, and Delete buttons were added for up to the first 3 matching plans.'
              : 'View buttons were added for up to the first 3 matching plans (Viewer: browse only).'
            : undefined,
      });
    }

    case 'find_plans_by_text': {
      const rawQ = typeof args.query === 'string' ? args.query.trim() : '';
      if (!rawQ) return JSON.stringify({ error: 'query is required' });

      const searchAll =
        args.search_all_communities === true ||
        (typeof args.search_all_communities === 'string' &&
          args.search_all_communities.toLowerCase() === 'true');

      let communityOid: mongoose.Types.ObjectId | null = null;
      let scopedName: string | null = null;

      const optional =
        typeof args.community_name_or_slug === 'string'
          ? args.community_name_or_slug.trim()
          : '';
      if (optional) {
        const list = await findCommunitiesByNameSearch(optional, 8);
        if (list.length > 0) {
          const candSet = new Set(communityNameCandidates(optional).map((s) => s.toLowerCase()));
          const exact =
            list.find(
              (c) =>
                candSet.has(c.name.toLowerCase()) ||
                (c.slug && candSet.has(String(c.slug).toLowerCase()))
            ) || list[0];
          communityOid = exact._id as mongoose.Types.ObjectId;
          scopedName = exact.name;
        }
      } else if (!searchAll && ctx.pathname) {
        const slug = communitySlugFromPath(ctx.pathname);
        if (slug) {
          const comm = await findCommunityByUrlSlug(slug);
          if (comm) {
            communityOid = comm.id;
            scopedName = comm.name;
          }
        }
      }

      const textMatch = buildPlanTextOrMatch(rawQ);
      if (!textMatch) {
        return JSON.stringify({ error: 'query is empty' });
      }

      const baseParts: Record<string, unknown>[] = [textMatch];
      if (communityOid) {
        baseParts.unshift({ 'community._id': communityOid });
      }

      let filter: Record<string, unknown> = baseParts.length > 1 ? { $and: baseParts } : textMatch;
      let plans = await Plan.find(filter).sort({ last_updated: -1 }).limit(50).lean();

      if (plans.length === 0) {
        const tokenMatch = buildPlanTokenAndMatch(rawQ);
        if (tokenMatch) {
          const tokenParts: Record<string, unknown>[] = [tokenMatch];
          if (communityOid) {
            tokenParts.unshift({ 'community._id': communityOid });
          }
          filter = tokenParts.length > 1 ? { $and: tokenParts } : tokenMatch;
          plans = await Plan.find(filter).sort({ last_updated: -1 }).limit(50).lean();
        }
      }

      if (plans.length > 0) {
        pushPlanActionButtonsForFoundPlans(plans, ctx);
      }

      return JSON.stringify({
        query: rawQ,
        scoped_to_community: scopedName,
        scoped_by_path: Boolean(!optional && !searchAll && communityOid),
        plans: plans.map((p) => ({
          id: String(p._id),
          plan_name: p.plan_name,
          address: p.address ?? null,
          display_label: p.type === 'now' && p.address ? p.address : p.plan_name,
          community: p.community?.name,
          community_id: p.community?._id ? String(p.community._id) : null,
          price: p.price,
          company: p.company?.name,
          type: p.type,
        })),
        count: plans.length,
        ui_buttons_added:
          plans.length > 0
            ? ctx.canManagePlans
              ? 'View, Edit, and Delete buttons were added for up to the first 3 matching plans.'
              : 'View buttons were added for up to the first 3 matching plans (Viewer: browse only).'
            : undefined,
        hint:
          plans.length === 0
            ? 'No rows matched. Spec homes may list the street in address; try find_plans_by_text again with a shorter fragment (e.g. house number + street name).'
            : undefined,
      });
    }

    case 'suggest_add_community': {
      if (!ctx.canManagePlans) {
        if (ctx.userMessage && userIntendsAddPlanOrSpec(ctx.userMessage)) {
          return JSON.stringify({
            error:
              'Adding plans requires Editor permission. Viewers can search and view plans only.',
          });
        }
        return JSON.stringify({
          error:
            'Creating a community requires Editor permission. Viewers can browse and search communities only.',
        });
      }
      if (ctx.userMessage && userIntendsAddPlanOrSpec(ctx.userMessage)) {
        return await executeAssistantTool(
          'open_plan_ui_workflow',
          JSON.stringify({ action: 'add', community_name_or_query: ctx.userMessage }),
          ctx
        );
      }
      ctx.buttons.push({
        kind: 'add_community',
        label: 'Add new community',
      });
      return JSON.stringify({
        success: true,
        message: 'A button will appear to open the Add Community dialog on the Communities page.',
      });
    }

    case 'open_plan_ui_workflow': {
      if (!ctx.canManagePlans) {
        return JSON.stringify({
          error:
            'Editor permission is required to add, edit, or delete plans. Viewers can search and view only.',
        });
      }
      const action = args.action;
      if (action !== 'add' && action !== 'edit' && action !== 'delete') {
        return JSON.stringify({ error: 'action must be add, edit, or delete' });
      }

      if (action === 'add') {
        const q =
          typeof args.community_name_or_query === 'string'
            ? args.community_name_or_query.trim()
            : '';
        if (!q) {
          return JSON.stringify({ error: 'community_name_or_query is required for add' });
        }
        const list = await findCommunitiesByNameSearch(q, 8);
        if (list.length === 0) {
          return JSON.stringify({ error: 'No matching community' });
        }
        const candSet = new Set(communityNameCandidates(q).map((s) => s.toLowerCase()));
        const exact =
          list.find(
            (c) =>
              candSet.has(c.name.toLowerCase()) ||
              (c.slug && candSet.has(String(c.slug).toLowerCase()))
          ) || list[0];
        const best = exact;
        const slug = communityNameToSlug(best.name);
        ctx.buttons.push({
          kind: 'add_plan',
          label: `Add plan in ${best.name}`,
          communitySlug: slug,
        });
        return JSON.stringify({
          success: true,
          community: { name: best.name, slug },
        });
      }

      const planId = typeof args.plan_id === 'string' ? args.plan_id.trim() : '';
      if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
        return JSON.stringify({
          error: 'Valid plan_id is required for edit/delete',
        });
      }

      const plan = await Plan.findById(planId);
      if (!plan) {
        return JSON.stringify({ error: 'Plan not found' });
      }
      const cname = plan.community?.name;
      if (!cname) {
        return JSON.stringify({ error: 'Plan has no community' });
      }
      const slug = communityNameToSlug(cname);
      const labelBase = plan.plan_name || 'plan';

      if (action === 'edit') {
        ctx.buttons.push({
          kind: 'edit_plan',
          label: `Edit ${labelBase}`,
          communitySlug: slug,
          planId,
        });
      } else {
        ctx.buttons.push({
          kind: 'delete_plan',
          label: `Delete ${labelBase}`,
          communitySlug: slug,
          planId,
        });
      }

      return JSON.stringify({
        success: true,
        plan: { id: planId, plan_name: plan.plan_name },
        slug,
      });
    }

    case 'create_plan_from_prompt': {
      if (!ctx.canManagePlans) {
        return JSON.stringify({
          error: 'Editor permission required to create plans.',
        });
      }

      const communityQuery =
        typeof args.community_name_or_query === 'string'
          ? args.community_name_or_query.trim()
          : '';
      const planName = typeof args.plan_name === 'string' ? args.plan_name.trim() : '';
      const companyName = typeof args.company_name === 'string' ? args.company_name.trim() : '';
      const typeArg = typeof args.type === 'string' ? args.type.trim().toLowerCase() : '';
      const type: 'plan' | 'now' = typeArg === 'now' ? 'now' : 'plan';
      const price =
        typeof args.price === 'number'
          ? args.price
          : Number(typeof args.price === 'string' ? args.price : NaN);
      const sqft =
        typeof args.sqft === 'number'
          ? args.sqft
          : Number(typeof args.sqft === 'string' ? args.sqft : NaN);
      const stories = typeof args.stories === 'string' ? args.stories.trim() : undefined;
      const beds = typeof args.beds === 'string' ? args.beds.trim() : undefined;
      const baths = typeof args.baths === 'string' ? args.baths.trim() : undefined;
      const address = typeof args.address === 'string' ? args.address.trim() : undefined;
      const designNumber =
        typeof args.design_number === 'string' ? args.design_number.trim() : undefined;

      if (!communityQuery || !planName || !companyName || !Number.isFinite(price) || price <= 0) {
        return JSON.stringify({
          error:
            'community_name_or_query, plan_name, company_name, and a valid positive price are required.',
        });
      }

      const list = await findCommunitiesByNameSearch(communityQuery, 8);
      if (list.length === 0) {
        return JSON.stringify({ error: 'No matching community found' });
      }
      const candSet = new Set(communityNameCandidates(communityQuery).map((s) => s.toLowerCase()));
      const best =
        list.find(
          (c) =>
            candSet.has(c.name.toLowerCase()) || (c.slug && candSet.has(String(c.slug).toLowerCase()))
        ) || list[0];

      let companyDoc = await Company.findOne({ name: companyName });
      if (!companyDoc) {
        companyDoc = await Company.create({ name: companyName });
      }

      const companyRef = { _id: companyDoc._id, name: companyDoc.name };
      const communityRef = {
        _id: best._id as mongoose.Types.ObjectId,
        name: best.name,
        location: (best as { location?: string }).location,
      };
      const computedPpsf = Number.isFinite(sqft) && sqft > 0 ? Number((price / sqft).toFixed(2)) : undefined;

      const existing = await Plan.findOne({
        plan_name: planName,
        'company.name': companyRef.name,
        'community._id': communityRef._id,
        type,
      });
      if (existing) {
        return JSON.stringify({
          error: 'A plan with the same name/company/type already exists in that community.',
          existing_plan_id: String(existing._id),
        });
      }

      const created = await Plan.create({
        plan_name: planName,
        price,
        sqft: Number.isFinite(sqft) && sqft > 0 ? sqft : undefined,
        stories: stories || undefined,
        price_per_sqft: computedPpsf,
        company: companyRef,
        community: communityRef,
        type,
        beds: beds || undefined,
        baths: baths || undefined,
        address: address || undefined,
        design_number: designNumber || undefined,
        last_updated: new Date(),
      });

      pushPlanActionButtonsForFoundPlans(
        [
          {
            _id: created._id,
            plan_name: created.plan_name,
            address: created.address ?? null,
            type: created.type,
            community: { name: best.name },
          },
        ],
        ctx,
        1
      );

      return JSON.stringify({
        success: true,
        created: {
          id: String(created._id),
          plan_name: created.plan_name,
          community: best.name,
          company: companyRef.name,
          type: created.type,
          price: created.price,
        },
        ui_buttons_added:
          'View, Edit, and Delete buttons were added for the created plan.',
      });
    }

    case 'analyze_community_changes': {
      const rawCommQ =
        typeof args.community_name_or_query === 'string'
          ? args.community_name_or_query.trim()
          : '';

      // Resolve community name/slug (DB lookup for canonical name only, not plan data)
      let resolvedName: string | null = null;
      let resolvedSlug: string | null = null;

      if (rawCommQ) {
        const list = await findCommunitiesByNameSearch(rawCommQ, 8);
        if (list.length > 0) {
          const candSet = new Set(communityNameCandidates(rawCommQ).map((s) => s.toLowerCase()));
          const exact =
            list.find(
              (c) =>
                candSet.has(c.name.toLowerCase()) ||
                (c.slug && candSet.has(String(c.slug).toLowerCase()))
            ) || list[0];
          resolvedName = exact.name;
          resolvedSlug = communityNameToSlug(exact.name);
        }
      }

      if (!resolvedName && ctx.pathname) {
        const slug = communitySlugFromPath(ctx.pathname);
        if (slug) {
          const comm = await findCommunityByUrlSlug(slug);
          if (comm) {
            resolvedName = comm.name;
            resolvedSlug = communityNameToSlug(comm.name);
          }
        }
      }

      // Fallback: community may not be in DB yet — use raw query directly
      if (!resolvedName && rawCommQ) {
        resolvedName = rawCommQ;
        resolvedSlug = communityNameToSlug(rawCommQ);
      }

      if (!resolvedName || !resolvedSlug) {
        return JSON.stringify({
          error: 'Could not identify the community. Please specify a community name (e.g. "Elevon").',
        });
      }

      // Fetch live plans via OpenAI web search (same approach as /api/scrape)
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const webPrompt = `Web search for all current home floor plans and quick move-ins (spec homes) available in the ${resolvedName} community in the United States. List every builder/company and each of their available plans.

Return a JSON object with a "plans" array. Each plan object should have:
- company (string): Builder/company name
- plan_name (string): Plan name or model name (use full address for spec/quick move-in homes)
- price (number): Price in USD
- sqft (number, optional): Square footage
- stories (string, optional): Number of stories
- beds (string, optional): Number of bedrooms
- baths (string, optional): Number of bathrooms
- address (string, optional): Full address for spec/quick move-in homes
- type (string): "plan" for floor plans, "now" for quick move-ins/spec homes

Return ONLY valid JSON, no additional text.`;

      let livePlans: AssistantPlanItem[] = [];
      try {
        const completion = await openaiClient.responses.create({
          model: 'o4-mini',
          tools: [{ type: 'web_search' }],
          input: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that provides accurate, current information about home building communities in the United States. Always return ONLY valid JSON with accurate, up-to-date data. Do not include any text before or after the JSON.',
            },
            { role: 'user', content: webPrompt },
          ],
        });

        const aiResponse = completion.output_text;
        if (aiResponse) {
          let cleaned = aiResponse.trim();
          const codeBlock = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
          if (codeBlock?.[1]) cleaned = codeBlock[1].trim();
          const parsed = JSON.parse(cleaned) as Record<string, unknown>;
          const arr = Array.isArray(parsed)
            ? (parsed as Record<string, unknown>[])
            : ((parsed.plans ?? parsed.data ?? []) as Record<string, unknown>[]);

          livePlans = arr.map((p, i) => ({
            id: `live-${i}`,
            display_label:
              String(p.type) === 'now' && p.address
                ? String(p.address)
                : String(p.plan_name ?? ''),
            plan_name: p.plan_name ? String(p.plan_name) : undefined,
            address: p.address ? String(p.address) : null,
            company: p.company ? String(p.company) : null,
            price: p.price != null ? Number(p.price) : undefined,
            sqft: p.sqft != null ? Number(p.sqft) : null,
            beds: p.beds != null ? String(p.beds) : null,
            baths: p.baths != null ? String(p.baths) : null,
            type: p.type ? String(p.type) : 'plan',
            days_ago: null,
          }));
        }
      } catch (err) {
        console.error('analyze_community_changes web search failed:', err);
      }

      ctx.buttons.push({
        kind: 'show_plans',
        label: `Show ${livePlans.length} plan${livePlans.length !== 1 ? 's' : ''} for ${resolvedName}`,
        communitySlug: resolvedSlug,
        communityName: resolvedName,
        plans: livePlans.slice(0, 60),
      });

      if (ctx.canManagePlans) {
        ctx.buttons.push({
          kind: 'add_plan',
          label: `Add plan in ${resolvedName}`,
          communitySlug: resolvedSlug,
        });
      }

      return JSON.stringify({
        community: resolvedName,
        total_plans: livePlans.length,
        source: 'live_web_search',
        ui_buttons_added: `"Show Plans" button with ${livePlans.length} live plans.${ctx.canManagePlans ? ' "Add plan" button also added.' : ''}`,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

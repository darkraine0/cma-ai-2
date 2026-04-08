import mongoose from 'mongoose';
import Community from '@/app/models/Community';
import Plan from '@/app/models/Plan';
import { communityNameToSlug } from '@/app/community/utils/formatCommunityName';
import type { AssistantChatButton } from '@/app/lib/assistantChatTypes';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export type AssistantToolContext = {
  buttons: AssistantChatButton[];
  /** Current app path (e.g. /community/cambridge-crossing) to scope plan search. */
  pathname?: string | null;
  /** Last user message (for correcting wrong tool choice). */
  userMessage?: string | null;
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
  return out.slice(0, 6);
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
 * When search tools return matching plans, register Edit / Delete chips (dedupeButtons caps total).
 * Up to 3 plans → 6 buttons (edit+delete each).
 */
function pushEditDeleteButtonsForFoundPlans(
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
  for (const p of slice) {
    const planId = String(p._id);
    if (!mongoose.Types.ObjectId.isValid(planId)) continue;
    const cname = p.community?.name?.trim();
    if (!cname) continue;
    const slug = communityNameToSlug(cname);
    const labelBase = planButtonLabel(p);
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
      name: 'suggest_add_community',
      description:
        'ONLY when the user wants to create a brand-new community (subdivision) in MarketMap. NEVER use for adding a plan, spec, or home to an existing community — use open_plan_ui_workflow with action add instead.',
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
        'Register buttons to add, edit, or delete a plan or spec in the UI. For action add: user wants a new plan/spec inside an existing community — pass community_name_or_query (community name or full sentence).',
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
];

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
        pushEditDeleteButtonsForFoundPlans(plans, ctx);
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
            ? 'Edit and Delete buttons were added for up to the first 3 matching plans.'
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
        pushEditDeleteButtonsForFoundPlans(plans, ctx);
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
            ? 'Edit and Delete buttons were added for up to the first 3 matching plans.'
            : undefined,
        hint:
          plans.length === 0
            ? 'No rows matched. Spec homes may list the street in address; try find_plans_by_text again with a shorter fragment (e.g. house number + street name).'
            : undefined,
      });
    }

    case 'suggest_add_community': {
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

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

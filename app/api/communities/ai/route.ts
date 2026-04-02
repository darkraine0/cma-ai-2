import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import connectDB from '@/app/lib/mongodb';
import Community from '@/app/models/Community';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type CommunityResult = {
  name: string;
  description: string | null;
  location: string | null;
  companies: string[];
  companyDetails: Array<{
    name: string;
    description: string | null;
    website: string | null;
    headquarters: string | null;
    founded: string | null;
  }>;
  alreadyExists: boolean;
};

type RawCompany = {
  name?: unknown;
  description?: unknown;
  website?: unknown;
  headquarters?: unknown;
  founded?: unknown;
};

type RawCommunity = {
  name?: unknown;
  description?: unknown;
  location?: unknown;
  companies?: unknown;
  sourceUrl?: unknown;
};

function cleanJsonPayload(raw: string): string {
  const trimmed = raw.trim();
  const markdownCodeBlockPattern = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
  const match = trimmed.match(markdownCodeBlockPattern);
  return match?.[1]?.trim() || trimmed;
}

function normalizeCommunity(raw: RawCommunity): {
  name: string;
  description: string | null;
  location: string | null;
  companies: string[];
  companyDetails: Array<{
    name: string;
    description: string | null;
    website: string | null;
    headquarters: string | null;
    founded: string | null;
  }>;
} | null {
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;

  const description =
    typeof raw.description === 'string' && raw.description.trim()
      ? raw.description.trim()
      : null;

  const location =
    typeof raw.location === 'string' && raw.location.trim()
      ? raw.location.trim()
      : null;

  const normalizeCompany = (
    company: unknown
  ): {
    name: string;
    description: string | null;
    website: string | null;
    headquarters: string | null;
    founded: string | null;
  } | null => {
    if (typeof company === 'string') {
      const companyName = company.trim();
      if (!companyName) return null;
      return {
        name: companyName,
        description: null,
        website: null,
        headquarters: null,
        founded: null,
      };
    }

    if (!company || typeof company !== 'object') return null;
    const rawCompany = company as RawCompany;
    const companyName = typeof rawCompany.name === 'string' ? rawCompany.name.trim() : '';
    if (!companyName) return null;

    const description =
      typeof rawCompany.description === 'string' && rawCompany.description.trim()
        ? rawCompany.description.trim()
        : null;
    const website =
      typeof rawCompany.website === 'string' && rawCompany.website.trim()
        ? rawCompany.website.trim()
        : null;
    const headquarters =
      typeof rawCompany.headquarters === 'string' && rawCompany.headquarters.trim()
        ? rawCompany.headquarters.trim()
        : null;
    const founded =
      rawCompany.founded != null && String(rawCompany.founded).trim()
        ? String(rawCompany.founded).trim()
        : null;

    return {
      name: companyName,
      description,
      website,
      headquarters,
      founded,
    };
  };

  const companyDetails = Array.isArray(raw.companies)
    ? raw.companies.map((c) => normalizeCompany(c)).filter(
        (
          c
        ): c is {
          name: string;
          description: string | null;
          website: string | null;
          headquarters: string | null;
          founded: string | null;
        } => c !== null
      )
    : [];

  const seenCompanyNames = new Set<string>();
  const dedupedCompanyDetails: Array<{
    name: string;
    description: string | null;
    website: string | null;
    headquarters: string | null;
    founded: string | null;
  }> = [];
  for (const company of companyDetails) {
    const key = company.name.toLowerCase();
    if (seenCompanyNames.has(key)) continue;
    seenCompanyNames.add(key);
    dedupedCompanyDetails.push(company);
  }

  // Always include UnionMain Homes for UnionMain-specific communities.
  if (!dedupedCompanyDetails.some((c) => c.name.toLowerCase().includes('unionmain') || c.name.toLowerCase().includes('union main'))) {
    dedupedCompanyDetails.unshift({
      name: 'UnionMain Homes',
      description: null,
      website: null,
      headquarters: null,
      founded: null,
    });
  }

  return {
    name,
    description,
    location,
    companies: dedupedCompanyDetails.map((c) => c.name),
    companyDetails: dedupedCompanyDetails,
  };
}

function dedupeCommunities(
  communities: Array<{
    name: string;
    description: string | null;
    location: string | null;
    companies: string[];
    companyDetails: Array<{
      name: string;
      description: string | null;
      website: string | null;
      headquarters: string | null;
      founded: string | null;
    }>;
  }>
) {
  const seen = new Set<string>();
  const deduped: Array<{
    name: string;
    description: string | null;
    location: string | null;
    companies: string[];
    companyDetails: Array<{
      name: string;
      description: string | null;
      website: string | null;
      headquarters: string | null;
      founded: string | null;
    }>;
  }> = [];

  for (const c of communities) {
    const key = c.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
  }

  return deduped;
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function verifyCommunitySource(
  raw: RawCommunity,
  communityName: string,
  options?: { relaxNameMatch?: boolean }
): Promise<boolean> {
  const sourceUrl = typeof raw.sourceUrl === 'string' ? raw.sourceUrl.trim() : '';
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
    return false;
  }

  try {
    const res = await fetch(sourceUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; community-search-bot/1.0)',
      },
      // Avoid hanging on slow pages.
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });

    if (!res.ok) return false;
    const pageText = (await res.text()).toLowerCase();
    const normalizedName = normalizeForMatch(communityName);
    const normalizedPage = normalizeForMatch(pageText);

    const mentionsUnionMain =
      pageText.includes('unionmain homes') ||
      pageText.includes('union main homes') ||
      pageText.includes('by unionmain homes') ||
      sourceUrl.toLowerCase().includes('unionmainhomes.com');

    const mentionsCommunityName =
      normalizedName.length > 0 && normalizedPage.includes(normalizedName);

    if (mentionsUnionMain && mentionsCommunityName) return true;

    // Map place search: allow a strong UnionMain signal plus a distinctive word from the community name.
    if (options?.relaxNameMatch && mentionsUnionMain && normalizedName.length > 0) {
      const token = normalizedName.split(/\s+/).find((t) => t.length >= 4);
      if (token && normalizedPage.includes(token)) return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    await connectDB();
    const body = await request.json();
    const { searchQuery, fromPlaceSelection } = body;

    if (!searchQuery || !searchQuery.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const searchTerm = searchQuery.trim();
    const fromMapsPlace = Boolean(fromPlaceSelection);

    const placeSelectionNote = fromMapsPlace
      ? `The user selected this location from Google Maps: "${searchTerm}".
Your job is to list named residential communities or master-planned developments in that city, metro area, or state (as appropriate) where UnionMain Homes or Union Main Homes builds homes.
Return real community development names (e.g. "Waterside", "Cambridge Crossing"), not airports, malls, stadiums, aquariums, or generic POIs unless the development is literally named that way.
Each community must still satisfy the sourceUrl and verification rules below.
`
      : '';

    // Ground results with web search and require explicit UnionMain verification.
    const response = await openai.responses.create({
      model: 'o4-mini',
      tools: [{ type: 'web_search' }],
      input: [
        {
          role: 'system',
          content:
            'You are a strict data extraction assistant for UnionMain Homes communities. Use live web search and include a community ONLY when a source explicitly indicates UnionMain Homes (or Union Main Homes) builds in that community. If uncertain, omit it. For each included community, return all builders/companies that build in that same community (not only UnionMain). Prefer official community or builder pages when available. Return ONLY valid JSON and nothing else.',
        },
        {
          role: 'user',
          content: `${placeSelectionNote}Search for residential home building communities built by Union Main Homes matching "${searchTerm}".

This can match partial community name, location, or description.

Hard requirements:
1) Community eligibility: include a community only if UnionMain Homes / Union Main Homes is one of the builders in that community.
2) Companies field: include ALL builders/companies for that same community (for example: ["UnionMain Homes", "Fischer Homes"]).
3) Use exact community names as shown in marketing or listing pages.
4) Location must be "City, State" format (example: "Dallas, Texas").
5) Return up to 8 most relevant matches.
6) If no verified matches exist, return an empty array.

Return exactly this JSON structure:
{
  "communities": [
    {
      "name": "string",
      "description": "string",
      "location": "City, State",
      "companies": [
        {
          "name": "UnionMain Homes",
          "description": "string or null",
          "website": "https://... or null",
          "headquarters": "City, State or null",
          "founded": "year or null"
        }
      ],
      "sourceUrl": "https://..."
    }
  ]
}

Return ONLY valid JSON.`,
        },
      ],
    });

    const aiResponse = response.output_text;

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'Failed to get response from OpenAI' },
        { status: 500 }
      );
    }

    let responseData: { communities?: RawCommunity[]; community?: RawCommunity[] } = {};
    try {
      const cleaned = cleanJsonPayload(aiResponse);
      responseData = JSON.parse(cleaned);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON', details: aiResponse },
        { status: 500 }
      );
    }

    const rawCommunities = responseData.communities || responseData.community || [];
    const safeArray = Array.isArray(rawCommunities) ? rawCommunities : [];

    const normalizedCandidates = safeArray
      .map((item) => ({
        normalized: normalizeCommunity(item),
        raw: item,
      }))
      .filter(
        (
          item
        ): item is {
          normalized: {
            name: string;
            description: string | null;
            location: string | null;
            companies: string[];
            companyDetails: Array<{
              name: string;
              description: string | null;
              website: string | null;
              headquarters: string | null;
              founded: string | null;
            }>;
          };
          raw: RawCommunity;
        } =>
          item.normalized !== null
      );

    const verification = await Promise.all(
      normalizedCandidates.map(async (candidate) => {
        const verified = await verifyCommunitySource(candidate.raw, candidate.normalized.name, {
          relaxNameMatch: fromMapsPlace,
        });
        return verified ? candidate.normalized : null;
      })
    );

    const communities = dedupeCommunities(
      verification.filter(
        (
          item
        ): item is {
          name: string;
          description: string | null;
          location: string | null;
          companies: string[];
          companyDetails: Array<{
            name: string;
            description: string | null;
            website: string | null;
            headquarters: string | null;
            founded: string | null;
          }>;
        } => item !== null
      )
    ).slice(0, 8);

    // Check which communities already exist in database
    const communityNames = communities.map((c: any) => c.name).filter(Boolean);
    
    const existingCommunities = await Community.find({
      name: { $in: communityNames }
    }).select('name');

    const existingNames = new Set(existingCommunities.map((c: any) => c.name.toLowerCase()));

    // Mark which communities already exist
    const communitiesWithStatus: CommunityResult[] = communities.map((community) => ({
      name: community.name,
      description: community.description || null,
      location: community.location || null,
      companies: Array.isArray(community.companies) ? community.companies : [],
      companyDetails: Array.isArray(community.companyDetails) ? community.companyDetails : [],
      alreadyExists: existingNames.has(community.name?.toLowerCase() || ''),
    }));

    return NextResponse.json({
      communities: communitiesWithStatus,
      searchQuery: searchTerm,
    }, { status: 200 });
  } catch (error: any) {
    // Handle OpenAI API errors
    if (error.response) {
      return NextResponse.json(
        { error: 'OpenAI API error', message: error.response.data?.error?.message || error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to search communities with AI', message: error.message },
      { status: 500 }
    );
  }
}

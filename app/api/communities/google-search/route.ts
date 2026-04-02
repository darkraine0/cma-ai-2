import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Community from '@/app/models/Community';

const PLACES_BASE = 'https://places.googleapis.com/v1';

type LatLng = { latitude: number; longitude: number };
type Viewport = { low: LatLng; high: LatLng };

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
  source: 'google_places';
};

const DEFAULT_BUILDER = {
  name: 'UnionMain Homes',
  description: null as string | null,
  website: null as string | null,
  headquarters: null as string | null,
  founded: null as string | null,
};

/** Types that are rarely useful as a "community" name for this app */
const EXCLUDED_TYPES = new Set([
  'airport',
  'bus_station',
  'subway_station',
  'train_station',
  'transit_station',
  'hospital',
  'pharmacy',
  'school',
  'university',
  'shopping_mall',
  'store',
  'restaurant',
  'cafe',
  'bar',
  'gas_station',
  'parking',
  'tourist_attraction',
  'park',
]);

function getMapsApiKey(): string | null {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    null
  );
}

async function fetchPlaceViewportAndLocation(
  apiKey: string,
  placeId: string
): Promise<{ viewport: Viewport | null; center: LatLng | null; formattedAddress: string | null }> {
  const url = `${PLACES_BASE}/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(`${url}?languageCode=en`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'viewport,location,formattedAddress',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Place details failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    viewport?: Viewport;
    location?: LatLng;
    formattedAddress?: string;
  };

  const viewport =
    data.viewport?.low &&
    data.viewport?.high &&
    typeof data.viewport.low.latitude === 'number' &&
    typeof data.viewport.high.latitude === 'number'
      ? data.viewport
      : null;

  const center =
    data.location &&
    typeof data.location.latitude === 'number' &&
    typeof data.location.longitude === 'number'
      ? data.location
      : null;

  const formattedAddress =
    typeof data.formattedAddress === 'string' && data.formattedAddress.trim()
      ? data.formattedAddress.trim()
      : null;

  return { viewport, center, formattedAddress };
}

type SearchTextBody = {
  textQuery: string;
  languageCode?: string;
  regionCode?: string;
  pageSize?: number;
  pageToken?: string;
  locationBias?: { rectangle?: Viewport; circle?: { center: LatLng; radius: number } };
  locationRestriction?: { rectangle: Viewport };
};

async function searchTextOnce(
  apiKey: string,
  body: SearchTextBody
): Promise<{ places: unknown[]; nextPageToken: string | null }> {
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.types',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Text search failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    places?: unknown[];
    nextPageToken?: string;
  };

  return {
    places: Array.isArray(data.places) ? data.places : [],
    nextPageToken: data.nextPageToken ?? null,
  };
}

function isExcludedPlace(types: unknown): boolean {
  if (!Array.isArray(types)) return false;
  return types.some((t) => typeof t === 'string' && EXCLUDED_TYPES.has(t));
}

function normalizePlaceToCandidate(raw: unknown): { name: string; location: string | null } | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as {
    displayName?: { text?: string };
    formattedAddress?: string;
  };
  const name =
    typeof p.displayName?.text === 'string' ? p.displayName.text.trim() : '';
  if (!name) return null;
  const location =
    typeof p.formattedAddress === 'string' && p.formattedAddress.trim()
      ? p.formattedAddress.trim()
      : null;
  return { name, location };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = getMapsApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key is not configured (GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const placeId = typeof body.placeId === 'string' ? body.placeId.trim() : '';
    const locationLabel =
      typeof body.locationLabel === 'string' ? body.locationLabel.trim() : '';

    if (!placeId) {
      return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
    }

    await connectDB();

    const { viewport, center, formattedAddress } = await fetchPlaceViewportAndLocation(
      apiKey,
      placeId
    );

    const labelForQueries = locationLabel || formattedAddress || 'area';
    const queries = [
      `master planned community ${labelForQueries}`,
      `new home community ${labelForQueries}`,
      `housing development ${labelForQueries}`,
      `subdivision ${labelForQueries}`,
    ];

    const locationBias =
      viewport
        ? { rectangle: viewport }
        : center
          ? { circle: { center, radius: 45_000 } }
          : null;

    if (!locationBias) {
      return NextResponse.json(
        { error: 'Could not determine map bounds for this place. Try a more specific city or address.' },
        { status: 400 }
      );
    }

    const merged: unknown[] = [];

    for (const textQuery of queries) {
      let pageToken: string | undefined;
      let pages = 0;
      do {
        const reqBody: SearchTextBody = {
          textQuery,
          languageCode: 'en',
          regionCode: 'US',
          pageSize: 20,
          pageToken,
          locationBias,
        };

        const { places, nextPageToken } = await searchTextOnce(apiKey, reqBody);
        merged.push(...places);
        pageToken = nextPageToken ?? undefined;
        pages += 1;
      } while (pageToken && pages < 2);
    }

    const seen = new Set<string>();
    const candidates: Array<{ name: string; location: string | null }> = [];

    for (const raw of merged) {
      const types =
        raw && typeof raw === 'object' && 'types' in raw
          ? (raw as { types?: unknown }).types
          : undefined;
      if (isExcludedPlace(types)) continue;

      const normalized = normalizePlaceToCandidate(raw);
      if (!normalized) continue;
      const key = normalized.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(normalized);
      if (candidates.length >= 24) break;
    }

    const names = candidates.map((c) => c.name);
    const existingCommunities = await Community.find({
      name: { $in: names },
    }).select('name');
    const existingLower = new Set(
      existingCommunities.map((c: { name: string }) => c.name.toLowerCase())
    );

    const communities: CommunityResult[] = candidates.slice(0, 20).map((c) => ({
      name: c.name,
      description: null,
      location: c.location,
      companies: [DEFAULT_BUILDER.name],
      companyDetails: [{ ...DEFAULT_BUILDER }],
      alreadyExists: existingLower.has(c.name.toLowerCase()),
      source: 'google_places',
    }));

    return NextResponse.json({
      communities,
      locationLabel: locationLabel || formattedAddress || null,
      source: 'google_places',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Google Places search failed', message },
      { status: 500 }
    );
  }
}

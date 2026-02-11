import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import { identifyForScrape } from '@/app/lib/identify';

/**
 * POST /api/identify
 * Body: { communityId?, communityName?, companyId?, companyName?, segmentId? }
 * Returns the name to use for scraping (alias if set) and optional segment label.
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const {
      communityId,
      communityName,
      companyId,
      companyName,
      segmentId,
    } = body;

    const result = await identifyForScrape({
      communityId,
      communityName,
      companyId,
      companyName,
      segmentId,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Community or company not found', found: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      communityId: result.communityId.toString(),
      companyId: result.companyId.toString(),
      communityName: result.communityName,
      companyName: result.companyName,
      communityNameForScrape: result.communityNameForScrape,
      segmentLabelForScrape: result.segmentLabelForScrape ?? null,
    });
  } catch (error: any) {
    console.error('Identify error:', error);
    return NextResponse.json(
      { error: 'Identification failed', message: error.message },
      { status: 500 }
    );
  }
}

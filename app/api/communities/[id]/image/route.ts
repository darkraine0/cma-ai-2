import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Community from '@/app/models/Community';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB();
    const resolvedParams = params instanceof Promise ? await params : params;
    const communityId = resolvedParams.id;

    if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
      return NextResponse.json({ error: 'Invalid community ID' }, { status: 400 });
    }

    const community = await Community.findById(communityId).select('imageData').lean();
    if (!community?.imageData) {
      return NextResponse.json({ error: 'No image for this community' }, { status: 404 });
    }

    const dataUrl = community.imageData as string;
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
    }

    const contentType = match[1];
    const base64 = match[2];
    const buffer = Buffer.from(base64, 'base64');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load image', message: error.message },
      { status: 500 }
    );
  }
}

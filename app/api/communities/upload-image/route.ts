import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requirePermission } from '@/app/lib/admin';

// Max size 4MB (Cloudinary free tier is generous; this keeps requests reasonable)
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'do9uwqrkm';
  const apiKey = process.env.CLOUDINARY_API_KEY || '323662367777369';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || 'I6PaZ5qqyJkYwbLpEMgprVRnQtc';
  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }
  return { cloudName, apiKey, apiSecret };
}

export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) return permissionCheck;

    const config = getCloudinaryConfig();
    if (!config) {
      return NextResponse.json(
        {
          error: 'Image upload not configured',
          message:
            'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment (e.g. Vercel). Sign up at cloudinary.com for a free account.',
        },
        { status: 503 }
      );
    }

    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });

    const formData = await request.formData();
    const file = formData.get('image');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image (e.g. JPG, PNG, WebP)' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'Image is too large. Use an image under 4MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mime = file.type || 'image/jpeg';
    const dataUri = `data:${mime};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'communities',
      resource_type: 'image',
    });

    const imageUrl = result.secure_url;
    return NextResponse.json({ path: imageUrl }, { status: 200 });
  } catch (error: any) {
    console.error('Community image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image', message: error.message },
      { status: 500 }
    );
  }
}

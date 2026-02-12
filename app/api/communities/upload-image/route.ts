import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { requirePermission } from '@/app/lib/admin';

function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) return permissionCheck;

    const formData = await request.formData();
    const file = formData.get('image');
    const name = (formData.get('name') as string)?.trim() || 'community';

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

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg';
    const slug = normalizeSlug(name);
    const filename = `${slug}-${Date.now()}.${safeExt}`;

    const publicDir = path.join(process.cwd(), 'public', 'communities');
    await mkdir(publicDir, { recursive: true });
    const filePath = path.join(publicDir, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const publicPath = `/communities/${filename}`;
    return NextResponse.json({ path: publicPath }, { status: 200 });
  } catch (error: any) {
    console.error('Community image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image', message: error.message },
      { status: 500 }
    );
  }
}

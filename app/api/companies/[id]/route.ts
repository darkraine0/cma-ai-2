import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Company from '@/app/models/Company';
import { requirePermission } from '@/app/lib/admin';
import mongoose from 'mongoose';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    await connectDB();
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid company ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, website, headquarters, founded, color } = body;

    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    if (name != null && typeof name === 'string') {
      const trimmed = name.trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: 'Company name cannot be empty' },
          { status: 400 }
        );
      }
      company.name = trimmed;
    }
    if (description !== undefined) company.description = description ? String(description).trim() : undefined;
    if (website !== undefined) company.website = website ? String(website).trim() : undefined;
    if (headquarters !== undefined) company.headquarters = headquarters ? String(headquarters).trim() : undefined;
    if (founded !== undefined) company.founded = founded ? String(founded).trim() : undefined;
    if (color !== undefined) {
      if (color == null || color === '') {
        company.color = undefined;
      } else if (typeof color === 'string') {
        const raw = color.trim();
        const hex = raw.startsWith('#') ? raw.slice(1) : raw;
        if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
          company.color = '#' + hex.toLowerCase();
        }
      }
    }

    await company.save();
    return NextResponse.json(company, { status: 200 });
  } catch (error: any) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Failed to update company', message: error.message },
      { status: 500 }
    );
  }
}

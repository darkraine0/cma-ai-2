import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Company from '@/app/models/Company';
import { requirePermission } from '@/app/lib/admin';

export async function GET() {
  try {
    await connectDB();
    const companies = await Company.find().sort({ name: 1 });
    return NextResponse.json(companies);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch companies', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check editor permission (async)
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    await connectDB();
    const body = await request.json();
    const { name, description, website, headquarters, founded } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check if company already exists (case-insensitive)
    // Escape special regex characters in the name
    const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingCompany = await Company.findOne({ 
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
    });
    if (existingCompany) {
      return NextResponse.json(
        { error: 'Company already exists', existingCompany },
        { status: 409 }
      );
    }

    // Prepare company data - only include fields that have values
    const companyData: any = {
      name: trimmedName,
    };

    if (description && String(description).trim()) {
      companyData.description = String(description).trim();
    }
    if (website && String(website).trim()) {
      companyData.website = String(website).trim();
    }
    if (headquarters && String(headquarters).trim()) {
      companyData.headquarters = String(headquarters).trim();
    }
    if (founded) {
      // Convert to string and trim (founded might be a number from AI)
      const foundedStr = String(founded).trim();
      if (foundedStr) {
        companyData.founded = foundedStr;
      }
    }

    const company = new Company(companyData);

    await company.save();
    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    console.error('Error creating company:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Company already exists', message: 'A company with this name already exists in the database' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { 
        error: 'Failed to create company', 
        message: error.message || 'Unknown error occurred',
        details: error.stack 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check editor permission (async)
    const permissionCheck = await requirePermission(request, 'editor');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    const company = await Company.findByIdAndDelete(id);
    
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Company deleted successfully', company },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete company', message: error.message },
      { status: 500 }
    );
  }
}


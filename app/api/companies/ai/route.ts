import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import connectDB from '@/app/lib/mongodb';
import Company from '@/app/models/Company';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const { searchQuery } = body;

    if (!searchQuery) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Fetch company recommendations from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that searches and recommends home building companies. Provide accurate, factual information in JSON format. Return ONLY valid JSON, no additional text. Always return an array of companies, even if there is only one match.',
        },
        {
          role: 'user',
          content: `Search for home building companies matching "${searchQuery}". This could be a partial name, location, or description. Return a JSON object with a "companies" array. Each company object should have: name (exact company name), description (brief overview of the company), website (official website URL if known, otherwise null), headquarters (city and state, e.g., "Dallas, Texas"), and founded (year founded if known, otherwise null). Return up to 8 most relevant home building companies. If the search term is very specific, still return an array with matching companies. Only return the JSON object, no additional text.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'Failed to get response from OpenAI' },
        { status: 500 }
      );
    }

    let responseData;
    try {
      responseData = JSON.parse(aiResponse);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Failed to parse AI response', details: aiResponse },
        { status: 500 }
      );
    }

    if (!Array.isArray(responseData.companies)) {
      return NextResponse.json(
        { error: 'AI response did not contain a valid companies array', details: responseData },
        { status: 500 }
      );
    }

    // Check which companies already exist
    const existingCompanies = await Company.find({
      name: { $in: responseData.companies.map((c: any) => c.name) }
    }).select('name');

    const existingNames = new Set(existingCompanies.map(c => c.name.toLowerCase()));

    const companiesWithStatus = responseData.companies.map((company: any) => ({
      ...company,
      alreadyExists: existingNames.has(company.name.toLowerCase()),
    }));

    return NextResponse.json({ companies: companiesWithStatus }, { status: 200 });
  } catch (error: any) {
    if (error.response) {
      return NextResponse.json(
        { error: 'OpenAI API error', message: error.response.data?.error?.message || error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to search companies with AI', message: error.message },
      { status: 500 }
    );
  }
}


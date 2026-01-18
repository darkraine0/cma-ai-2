import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import connectDB from '@/app/lib/mongodb';
import Community from '@/app/models/Community';

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

    if (!searchQuery || !searchQuery.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const searchTerm = searchQuery.trim();

    // Fetch community recommendations from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that searches and recommends residential home building communities specifically from Union Main Homes builder. Provide accurate, factual information in JSON format. Return ONLY valid JSON, no additional text. Always return an array of communities, even if there is only one match.',
        },
        {
          role: 'user',
          content: `Search for residential home building communities built by Union Main Homes matching "${searchTerm}". This could be a partial community name, location (like Dallas, TX), or description. IMPORTANT: Only return communities that are built by Union Main Homes builder. Do not include communities from other builders. Return a JSON object with a "communities" array. Each community object should have: name (exact community name as it appears on Union Main Homes website or marketing), description (brief overview with features and amenities specific to this Union Main Homes community), location (city and state, e.g., "Dallas, Texas"). Return up to 8 most relevant Union Main Homes communities. If the search term is very specific, still return an array with matching communities. Only return the JSON object, no additional text.`,
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

    // Extract communities array
    const communities = responseData.communities || responseData.community || [];
    
    // Ensure it's an array
    if (!Array.isArray(communities)) {
      // If response is a single object, convert to array
      if (responseData.name) {
        communities.push(responseData);
      } else {
        return NextResponse.json(
          { error: 'Invalid response format from AI', details: responseData },
          { status: 500 }
        );
      }
    }

    // Check which communities already exist in database
    const communityNames = communities.map((c: any) => c.name).filter(Boolean);
    
    const existingCommunities = await Community.find({
      name: { $in: communityNames }
    }).select('name');

    const existingNames = new Set(existingCommunities.map((c: any) => c.name.toLowerCase()));

    // Mark which communities already exist
    const communitiesWithStatus = communities.map((community: any) => ({
      name: community.name,
      description: community.description || null,
      location: community.location || null,
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

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import connectDB from '@/app/lib/mongodb';
import Plan from '@/app/models/Plan';
import PriceHistory from '@/app/models/PriceHistory';
import Company from '@/app/models/Company';
import Community from '@/app/models/Community';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PlanData {
  plan_name: string;
  price: number;
  sqft?: number;
  stories?: string;
  price_per_sqft?: number;
  beds?: string;
  baths?: string;
  address?: string;
  design_number?: string;
  type: 'plan' | 'now';
}

interface ErrorDetail {
  plan: string;
  error: string;
}

interface ScrapeResult {
  saved: (typeof Plan.prototype)[];
  errors: ErrorDetail[];
}

async function scrapePlansForType(
  company: string,
  community: string,
  type: 'now' | 'plan',
  openai: OpenAI
): Promise<ScrapeResult> {
  // Use AI web search for all requests
  const typeDescription = type === 'now' ? 'quick move-ins' : 'floor plans';
  
  const prompt = `Web search for getting the list of the ${typeDescription} from ${company}, for ${community} community. Give me that as the json structure of list. Give me most current and kind of accurate list of it.

Return a JSON object with a "plans" array. Each plan object should have:
- plan_name (string, required): The name/model of the plan or address for quick move-ins
- price (number, required): The price in USD
- sqft (number, optional): Square footage
- stories (string, optional): Number of stories
- beds (string or number, optional): Number of bedrooms
- baths (string or number, optional): Number of bathrooms
- address (string, optional): Full address (for quick move-ins)
- design_number (string, optional): Design/model number

Return ONLY valid JSON, no additional text.`;

  // Call OpenAI API with gpt-4o-search-preview model for AI web scraping

  console.log('Prompt:', prompt);
  const completion = await openai.responses.create({
    model: 'o4-mini',
    tools: [
      { type: "web_search" },
    ],
    input: [
      {
        role: 'system',
        content: 'You are a helpful assistant that provides accurate, current information about home building communities. Always return ONLY valid JSON with accurate, up-to-date data. Do not include any text before or after the JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const aiResponse = completion.output_text;
  
  // Validate that we got a response
  if (!aiResponse) {
    throw new Error('No response from OpenAI API');
  }

  // console.log('AI Response:\n', aiResponse);

  // Parse the JSON response with proper validation
  let plansData: { plans?: PlanData[]; data?: PlanData[]; [key: string]: unknown };
  try {
    // Trim any whitespace
    let cleanedResponse = aiResponse.trim();
    
    // Remove markdown code block formatting if present
    // Pattern: ```json\n{...}\n``` or ```\n{...}\n```
    const markdownCodeBlockPattern = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
    const match = cleanedResponse.match(markdownCodeBlockPattern);
    
    if (match && match[1]) {
      cleanedResponse = match[1].trim();
      console.log('Extracted JSON from markdown code block');
    }
    
    // Ensure response is valid JSON string
    if (!cleanedResponse.startsWith('{') && !cleanedResponse.startsWith('[')) {
      throw new Error('Response does not start with valid JSON');
    }
    
    plansData = JSON.parse(cleanedResponse);
    
    // Verify plansData is an object
    if (typeof plansData !== 'object' || plansData === null) {
      throw new Error('Parsed response is not a valid object');
    }
  } catch (parseError) {
    const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
    console.error('JSON Parse Error:', errorMessage);
    console.error('AI Response (first 500 chars):', aiResponse.substring(0, 500));
    throw new Error(`Failed to parse AI response as JSON: ${errorMessage}`);
  }

  // Extract plans array with validation
  const plans: PlanData[] = plansData.plans || plansData.data || [];
  
  if (!Array.isArray(plans)) {
    console.error('Invalid plans format:', plansData);
    throw new Error('Response does not contain a valid plans array');
  }
  
  if (plans.length === 0) {
    console.warn('AI returned empty plans array for', company, community, type);
  }

  // Process and save plans to MongoDB
  const savedPlans = [];
  const errors = [];

  for (const planData of plans) {
    try {
      // Validate required fields
      if (!planData.plan_name || !planData.price) {
        errors.push({
          plan: planData.plan_name || 'Unknown',
          error: 'Missing required fields (plan_name or price)',
        });
        continue;
      }

      // Calculate price_per_sqft if not provided
      let price_per_sqft = planData.price_per_sqft;
      if (!price_per_sqft && planData.sqft && planData.price) {
        price_per_sqft = Math.round((planData.price / planData.sqft) * 100) / 100;
      }

      // Find or create Company
      let companyDoc = await Company.findOne({ name: company.trim() });
      if (!companyDoc) {
        companyDoc = new Company({ name: company.trim() });
        await companyDoc.save();
      }

      // Find or create Community
      let communityDoc = await Community.findOne({ name: community.trim() });
      if (!communityDoc) {
        communityDoc = new Community({ name: community.trim() });
        await communityDoc.save();
      }

      // Prepare embedded company and community objects
      const companyRef = {
        _id: companyDoc._id,
        name: companyDoc.name,
      };

      const communityRef = {
        _id: communityDoc._id,
        name: communityDoc.name,
        location: communityDoc.location,
      };

      // Find existing plan using embedded structure
      const existingPlan = await Plan.findOne({
        plan_name: planData.plan_name,
        'company.name': company.trim(),
        'community.name': community.trim(),
        type: type,
      });

      if (existingPlan) {
        // Check if price changed
        if (existingPlan.price !== planData.price) {
          // Record price history
          const priceHistory = new PriceHistory({
            plan_id: existingPlan._id,
            old_price: existingPlan.price,
            new_price: planData.price,
            changed_at: new Date(),
          });
          await priceHistory.save();

          // Update plan
          existingPlan.price = planData.price;
          existingPlan.last_updated = new Date();
          existingPlan.price_changed_recently = true;
        }

        // Update other fields
        if (planData.sqft !== undefined) existingPlan.sqft = planData.sqft;
        if (planData.stories !== undefined) existingPlan.stories = planData.stories;
        if (price_per_sqft !== undefined) existingPlan.price_per_sqft = price_per_sqft;
        if (planData.beds !== undefined) existingPlan.beds = planData.beds.toString();
        if (planData.baths !== undefined) existingPlan.baths = planData.baths.toString();
        if (planData.address !== undefined) existingPlan.address = planData.address;
        if (planData.design_number !== undefined) existingPlan.design_number = planData.design_number;

        // Update embedded references in case company/community metadata changed
        existingPlan.company = companyRef;
        existingPlan.community = communityRef;

        await existingPlan.save();
        savedPlans.push(existingPlan);
      } else {
        // Create new plan with embedded structure
        const newPlan = new Plan({
          plan_name: planData.plan_name,
          price: planData.price,
          sqft: planData.sqft,
          stories: planData.stories,
          price_per_sqft: price_per_sqft,
          company: companyRef,
          community: communityRef,
          type: type,
          beds: planData.beds?.toString(),
          baths: planData.baths?.toString(),
          address: planData.address,
          design_number: planData.design_number,
          last_updated: new Date(),
        });

        await newPlan.save();
        savedPlans.push(newPlan);
      }
    } catch (planError) {
      const errorMessage = planError instanceof Error ? planError.message : 'Failed to save plan';
      errors.push({
        plan: planData.plan_name || 'Unknown',
        error: errorMessage,
      });
    }
  }

  return { saved: savedPlans, errors };
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
    const { company, community } = body;

    if (!company || !community) {
      return NextResponse.json(
        { error: 'Company and community are required' },
        { status: 400 }
      );
    }

    // Get data for both types in parallel (static or AI-powered)
    const [nowResults, planResults] = await Promise.allSettled([
      scrapePlansForType(company, community, 'now', openai),
      scrapePlansForType(company, community, 'plan', openai),
    ]);

    // Combine results
    const allSavedPlans = [];
    const allErrors = [];
    let nowSaved = 0;
    let planSaved = 0;
    let nowErrors = 0;
    let planErrors = 0;

    if (nowResults.status === 'fulfilled') {
      allSavedPlans.push(...nowResults.value.saved);
      allErrors.push(...nowResults.value.errors);
      nowSaved = nowResults.value.saved.length;
      nowErrors = nowResults.value.errors.length;
    } else {
      allErrors.push({
        plan: 'now',
        error: nowResults.reason?.message || 'Failed to scrape quick move-ins',
      });
    }

    if (planResults.status === 'fulfilled') {
      allSavedPlans.push(...planResults.value.saved);
      allErrors.push(...planResults.value.errors);
      planSaved = planResults.value.saved.length;
      planErrors = planResults.value.errors.length;
    } else {
      allErrors.push({
        plan: 'plan',
        error: planResults.reason?.message || 'Failed to scrape home plans',
      });
    }

    const totalSaved = allSavedPlans.length;
    const totalErrors = allErrors.length;

    return NextResponse.json({
      success: true,
      message: `Processed ${totalSaved} plans (${nowSaved} quick move-ins, ${planSaved} home plans)`,
      saved: totalSaved,
      errors: totalErrors,
      errorDetails: totalErrors > 0 ? allErrors : undefined,
      breakdown: {
        now: { saved: nowSaved, errors: nowErrors },
        plan: { saved: planSaved, errors: planErrors },
      },
      plans: allSavedPlans.map((p) => ({
        id: p._id,
        plan_name: p.plan_name,
        price: p.price,
        company: typeof p.company === 'object' ? p.company.name : p.company,
        community: typeof p.community === 'object' ? p.community.name : p.community,
        type: p.type,
      })),
    });
  } catch (error) {
    // Handle OpenAI API errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as { response?: { data?: { error?: { message?: string } } } };
      return NextResponse.json(
        {
          error: 'OpenAI API error',
          message: apiError.response?.data?.error?.message || errorMessage,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retrieve plans', message: errorMessage },
      { status: 500 }
    );
  }
}

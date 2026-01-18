import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json(
    { message: 'Signed out successfully' },
    { status: 200 }
  );

  // Clear auth token cookie
  response.cookies.delete('auth-token');

  return response;
}

import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  "https://light-settled-filly.ngrok-free.app/api/get_plans";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const community = searchParams.get("community")?.trim();
  if (!community) {
    return NextResponse.json(
      { error: "Missing community query parameter" },
      { status: 400 }
    );
  }

  try {
    const url = `${EXTERNAL_API_BASE}?community=${encodeURIComponent(community)}`;
    const res = await fetch(url, {
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Failed to fetch external plans", details: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    const arr = Array.isArray(data) ? data : [];
    return NextResponse.json(arr);
  } catch (err) {
    console.error("External get_plans error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch external plans",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}

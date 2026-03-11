import { NextResponse } from "next/server";

const EXTERNAL_API_URL =
  "https://light-settled-filly.ngrok-free.app/api/get_communities";

export async function GET() {
  try {
    const res = await fetch(EXTERNAL_API_URL, {
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Failed to fetch external communities", details: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("External get_communities error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch external communities",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}

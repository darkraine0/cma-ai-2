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
    const arr = Array.isArray(data) ? data : [];
    arr.sort((a: { id?: number }, b: { id?: number }) => (a.id ?? 0) - (b.id ?? 0));
    return NextResponse.json(arr);
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

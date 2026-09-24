// app/api/admin/shorten-url/route.ts

import { NextResponse } from "next/server";

/**
 * POST /api/admin/shorten-url
 *
 * Expects JSON body: { "url": "https://example.com/..." }
 * Returns JSON: { success: true, shortUrl: "https://tinyurl.com/abc123" }
 *          or { success: false, error: "Error message" }
 */
export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'url' in request body" },
        { status: 400 }
      );
    }

    // Use the public TinyURL API (no auth required)
    const tinyRes = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
    );
    if (!tinyRes.ok) {
      throw new Error(`TinyURL service responded with status ${tinyRes.status}`);
    }
    const shortUrl = (await tinyRes.text()).trim();
    if (!shortUrl.startsWith("http")) {
      throw new Error("TinyURL returned an unexpected response");
    }

    return NextResponse.json({ success: true, shortUrl });
  } catch (error: any) {
    console.error("Error in shorten-url route:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

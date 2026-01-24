import { NextRequest, NextResponse } from 'next/server';

/**
 * Generic bridge proxy - forwards requests to the WhatsApp bridge
 * Avoids CORS errors when calling bridge directly from browser
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '/status';
    const bridgeUrl = `http://52.91.198.23:3333${path}`;

    const res = await fetch(bridgeUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SwarYoga-Bridge-Proxy'
      },
      signal: AbortSignal.timeout(15_000)
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Bridge error: ${res.status}` },
        { status: res.status }
      );
    }

    // Try to parse as JSON first
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    // For HTML responses (like QR), return as-is
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': contentType || 'text/html' }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bridge proxy error';
    console.error('[bridge-proxy] Error:', message);
    return NextResponse.json(
      { error: message },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { path, body } = await request.json().catch(() => ({}));
    
    if (!path) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }

    const bridgeUrl = `http://52.91.198.23:3333${path}`;

    const res = await fetch(bridgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SwarYoga-Bridge-Proxy'
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000)
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Bridge error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bridge proxy error';
    console.error('[bridge-proxy] Error:', message);
    return NextResponse.json(
      { error: message },
      { status: 503 }
    );
  }
}

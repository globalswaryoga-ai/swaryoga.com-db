import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || process.env.WHATSAPP_BRIDGE_URL || 'http://localhost:3333';
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || process.env.WHATSAPP_WEB_BRIDGE_SECRET || 'swar-bridge-secret-2024';

// Mark as dynamic (uses request.nextUrl for query parameters)
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { action, path, body } = await req.json();

    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    const method = (action || 'GET').toUpperCase();
    const bridgeUrl = `${BRIDGE_URL}${path}`;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'x-bridge-secret': BRIDGE_SECRET,
        'Content-Type': 'application/json'
      }
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    console.log(`[QR Bridge Proxy] ${method} ${bridgeUrl}`);

    const res = await fetch(bridgeUrl, fetchOptions);
    
    // Check if response is successful before parsing as JSON
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[QR Bridge Proxy] Bridge error (${res.status}):`, errorText.substring(0, 200));
      return NextResponse.json(
        { error: `Bridge error: ${res.status}`, details: errorText.substring(0, 100) },
        { status: res.status }
      );
    }
    
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[QR Bridge Proxy] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bridge proxy error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const path = req.nextUrl.searchParams.get('path') || '/status';

    const bridgeUrl = `${BRIDGE_URL}${path}`;

    console.log(`[QR Bridge Proxy] GET ${bridgeUrl}`);

    const res = await fetch(bridgeUrl, {
      method: 'GET',
      headers: {
        'x-bridge-secret': BRIDGE_SECRET
      }
    });

    // Check if response is successful before parsing as JSON
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[QR Bridge Proxy] Bridge error (${res.status}):`, errorText.substring(0, 200));
      return NextResponse.json(
        { error: `Bridge error: ${res.status}`, details: errorText.substring(0, 100) },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[QR Bridge Proxy] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bridge proxy error' },
      { status: 500 }
    );
  }
}


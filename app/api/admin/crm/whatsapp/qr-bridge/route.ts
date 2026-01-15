import { NextRequest, NextResponse } from 'next/server';

// In production (Vercel), use EC2 IP. In development, use localhost.
const DEFAULT_BRIDGE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://3.109.154.61:3333'
  : 'http://localhost:3333';

// Prefer server-only vars, but also allow NEXT_PUBLIC_* (often configured first in Vercel/env files).
// This route runs server-side, so either works.
const BRIDGE_URL =
  process.env.WHATSAPP_BRIDGE_HTTP_URL ||
  process.env.WHATSAPP_BRIDGE_URL ||
  process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL ||
  DEFAULT_BRIDGE_URL;

const BRIDGE_SECRET =
  process.env.WHATSAPP_BRIDGE_SECRET ||
  process.env.WHATSAPP_WEB_BRIDGE_SECRET ||
  process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET ||
  'swar-bridge-secret-2024';

// Mark as dynamic (uses request.nextUrl for query parameters)
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { action, path, body } = await req.json();

    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    // Decode the path to handle special characters like @
    let decodedPath = path;
    try {
      decodedPath = decodeURIComponent(path);
    } catch (e) {
      console.warn('[QR Bridge Proxy] Could not decode path:', path);
    }

    const method = (action || 'GET').toUpperCase();
    const bridgeUrl = `${BRIDGE_URL}${decodedPath}`;

    // Determine timeout based on endpoint type
    // Messages polling should be fast (5s), other endpoints 10s
    const timeoutMs = decodedPath.includes('/messages') ? 5000 : 10000;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'x-bridge-secret': BRIDGE_SECRET,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    console.log(`[QR Bridge Proxy] ${method} ${bridgeUrl} (timeout: ${timeoutMs}ms)`);

    let res;
    try {
      res = await fetch(bridgeUrl, fetchOptions);
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        console.error(`[QR Bridge Proxy] Bridge timeout (${timeoutMs}ms) for ${decodedPath}`);
        return NextResponse.json(
          { error: `Bridge timeout (${timeoutMs}ms)`, path: decodedPath },
          { status: 504 }
        );
      }
      throw err;
    }
    clearTimeout(timeout);
    
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
    let path = req.nextUrl.searchParams.get('path') || '/status';
    
    // Decode the path to handle special characters like @
    try {
      path = decodeURIComponent(path);
    } catch (e) {
      // If decoding fails, use the original path
      console.warn('[QR Bridge Proxy] Could not decode path:', path);
    }

    const bridgeUrl = `${BRIDGE_URL}${path}`;

    // Determine timeout based on endpoint type
    // Messages polling should be fast (5s), other endpoints 10s
    const timeoutMs = path.includes('/messages') ? 5000 : 10000;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    console.log(`[QR Bridge Proxy] GET ${bridgeUrl} (timeout: ${timeoutMs}ms)`);

    let res;
    try {
      res = await fetch(bridgeUrl, {
        method: 'GET',
        headers: {
          'x-bridge-secret': BRIDGE_SECRET
        },
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        console.error(`[QR Bridge Proxy] Bridge timeout (${timeoutMs}ms) for ${path}`);
        return NextResponse.json(
          { error: `Bridge timeout (${timeoutMs}ms)`, path },
          { status: 504 }
        );
      }
      throw err;
    }
    clearTimeout(timeout);

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


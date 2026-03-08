import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';

/**
 * WhatsApp QR Bridge Proxy Endpoint
 * Proxies requests to the user's own WhatsApp bridge service (Baileys).
 * Each CRM user has their own bridge instance — URL stored in crm_user_settings.
 * 
 * Fallback: uses WHATSAPP_BRIDGE_HTTP_URL env var (for legacy / superadmin bridge).
 */

// Fallback: env var or local dev
const DEFAULT_BRIDGE_URL = 'http://localhost:3333';

const FALLBACK_BRIDGE_URL =
  process.env.WHATSAPP_BRIDGE_HTTP_URL ||
  process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL ||
  process.env.WHATSAPP_BRIDGE_URL ||
  DEFAULT_BRIDGE_URL;

const FALLBACK_BRIDGE_SECRET =
  process.env.WHATSAPP_BRIDGE_SECRET ||
  process.env.WHATSAPP_WEB_BRIDGE_SECRET ||
  process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET ||
  'swar-bridge-secret-2024';

// Mark as dynamic (uses request.nextUrl for query parameters)
export const dynamic = 'force-dynamic';
// Allow large media payloads (base64 encoded images/videos up to 50MB)
export const maxDuration = 60; // 60s function timeout for Vercel

/**
 * Resolve the bridge URL and secret for the authenticated user.
 * Returns per-user bridge from crm_user_settings if configured.
 * Returns null if user has no bridge configured (prevents data leakage between accounts).
 */
async function resolveUserBridge(authHeader: string | null): Promise<{ url: string; secret: string } | null> {
  try {
    const decoded = verifyToken(authHeader || '');
    if (decoded?.userId && decoded?.isAdmin) {
      await connectDB();
      const CRMUserSettings = getCRMUserSettings();
      const settings = await CRMUserSettings.findOne(
        { userId: decoded.userId },
        { qrBridgeUrl: 1, qrBridgeSecret: 1 }
      ).lean();
      if (settings?.qrBridgeUrl) {
        return {
          url: settings.qrBridgeUrl,
          secret: settings.qrBridgeSecret || FALLBACK_BRIDGE_SECRET,
        };
      }
      // User has no per-user bridge — fall back to env var bridge
      return { url: FALLBACK_BRIDGE_URL, secret: FALLBACK_BRIDGE_SECRET };
    }
  } catch (e) {
    console.warn('[QR Bridge Proxy] Failed to resolve user bridge:', (e as Error).message);
  }
  // Auth failed — fall back to env vars for backward compatibility
  return { url: FALLBACK_BRIDGE_URL, secret: FALLBACK_BRIDGE_SECRET };
}

function decodePathFully(rawPath: string): string {
  let decoded = rawPath || '';
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  if (!decoded.startsWith('/')) {
    decoded = `/${decoded}`;
  }
  return decoded;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const resolved = await resolveUserBridge(authHeader);
    if (!resolved) {
      return NextResponse.json(
        { error: 'No WhatsApp bridge configured. Please set up your bridge URL in QR WhatsApp settings.' },
        { status: 422 }
      );
    }
    const { url: BRIDGE_URL, secret: BRIDGE_SECRET } = resolved;

    const { action, path, body } = await req.json();

    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    // Decode the path to handle double-encoded values like %2540 (@)
    const decodedPath = decodePathFully(path);

    const method = (action || 'GET').toUpperCase();
    const bridgeUrl = `${BRIDGE_URL}${decodedPath}`;

    // Determine timeout based on endpoint type
    // /send with media: 45s (large base64 payloads)
    // Messages polling: 12s (can be slow, needs more time)
    // Status check: 8s
    // Contact/Group details: 3s (timeout quickly, use fallback)
    // Other endpoints: 8s
    let timeoutMs = 8000;
    if (decodedPath.includes('/send')) timeoutMs = 45000; // Large media uploads need more time
    if (decodedPath.includes('/messages')) timeoutMs = 12000;
    if (decodedPath.includes('/contact') || decodedPath.includes('/group')) timeoutMs = 3000;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'x-bridge-secret': BRIDGE_SECRET,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'SwarYoga-Bridge-Proxy/1.0'
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
    
    // Try to parse as JSON, fallback if not valid JSON
    let data: any;
    try {
      data = await res.json();
    } catch (jsonErr) {
      console.warn('[QR Bridge Proxy] Response is not JSON, returning as text');
      const text = await res.text();
      return NextResponse.json(
        { success: true, data: text, note: 'Response was not JSON' },
        { status: res.status }
      );
    }
    // Wrap in { success, data } so useCRM hook accepts the response
    return NextResponse.json({ success: true, data }, { status: res.status });
  } catch (err) {
    console.error('[QR Bridge Proxy] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Bridge proxy error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const resolved = await resolveUserBridge(authHeader);
    if (!resolved) {
      return NextResponse.json(
        { error: 'No WhatsApp bridge configured. Please set up your bridge URL in QR WhatsApp settings.' },
        { status: 422 }
      );
    }
    const { url: BRIDGE_URL, secret: BRIDGE_SECRET } = resolved;

    let path = req.nextUrl.searchParams.get('path') || '/status';
    
    // Decode the path to handle double-encoded values like %2540 (@)
    path = decodePathFully(path);

    const bridgeUrl = `${BRIDGE_URL}${path}`;

    // Determine timeout based on endpoint type
    // Media downloads: 30s (can be large files)
    // Messages polling: 12s (can be slow, needs more time)
    // Status check: 8s
    // Contact/Group details: 3s (timeout quickly, use fallback)
    // Other endpoints: 8s
    let timeoutMs = 8000;
    if (path.includes('/media')) timeoutMs = 30000; // Long timeout for media downloads
    if (path.includes('/messages')) timeoutMs = 12000; // Increased from 5s to 12s
    if (path.includes('/contact') || path.includes('/group')) timeoutMs = 3000;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    console.log(`[QR Bridge Proxy] GET ${bridgeUrl} (timeout: ${timeoutMs}ms)`);

    let res;
    try {
      res = await fetch(bridgeUrl, {
        method: 'GET',
        headers: {
          'x-bridge-secret': BRIDGE_SECRET,
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'SwarYoga-Bridge-Proxy/1.0'
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

    // Check if this is media (binary) content
    const contentType = res.headers.get('content-type') || '';
    if (path.includes('/media') && !contentType.includes('application/json')) {
      // This is binary media - pass through directly
      console.log(`[QR Bridge Proxy] Proxying binary media (${contentType})`);
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        status: res.status,
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=86400',
          'Content-Length': buffer.byteLength.toString()
        }
      });
    }

    // Check if response is successful before parsing
    if (!res.ok) {
      let errorText = '';
      try {
        errorText = await res.text();
      } catch (e) {
        errorText = `Status ${res.status}`;
      }
      console.error(`[QR Bridge Proxy] Bridge error (${res.status}):`, errorText.substring(0, 200));
      
      // For group chats that fail, return empty messages instead of error
      if (path.includes('/messages') && path.includes('@lid')) {
        console.warn(`[QR Bridge Proxy] Group chat message fetch failed, returning empty array`);
        return NextResponse.json(
          { messages: [], note: 'Group chat messages unavailable' },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { error: `Bridge error: ${res.status}`, details: errorText.substring(0, 100) },
        { status: res.status }
      );
    }

    // Try to parse as JSON, fallback if not valid JSON
    let data: any;
    try {
      data = await res.json();
    } catch (jsonErr) {
      console.warn('[QR Bridge Proxy] Response is not JSON, returning as text');
      try {
        const text = await res.text();
        return NextResponse.json(
          { success: true, data: text, note: 'Response was not JSON' },
          { status: res.status }
        );
      } catch (textErr) {
        return NextResponse.json(
          { success: true, data: 'Unable to read response', note: 'Response body unavailable' },
          { status: res.status }
        );
      }
    }
    // Wrap in { success, data } so useCRM hook accepts the response
    return NextResponse.json({ success: true, data }, { status: res.status });
  } catch (err) {
    console.error('[QR Bridge Proxy] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Bridge proxy error' },
      { status: 500 }
    );
  }
}


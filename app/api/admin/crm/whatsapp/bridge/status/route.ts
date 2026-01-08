import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const WHATSAPP_BRIDGE_HTTP_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL;

function isBridgeDisabled(): boolean {
  return (
    process.env.WHATSAPP_DISABLE_WEB_BRIDGE === 'true' ||
    process.env.WHATSAPP_DISABLE_QR === 'true' ||
    !WHATSAPP_BRIDGE_HTTP_URL
  );
}

function bridgeUrl(path: string) {
  if (!WHATSAPP_BRIDGE_HTTP_URL) return null;
  const base = WHATSAPP_BRIDGE_HTTP_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(`${base}${normalized}`);
}

// Avoid caching this status in serverless environments.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/crm/whatsapp/bridge/status
 * Server-side proxy to the WhatsApp Web bridge status endpoint.
 *
 * Why:
 * - Prevents browser CORS errors (crm.swaryoga.com -> wa-bridge.swaryoga.com)
 * - Keeps auth/admin gate consistent
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const decoded = verifyToken(token || '');

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    if (isBridgeDisabled()) {
      return NextResponse.json(
        { 
          success: true, 
          status: 'disabled', 
          message: 'WhatsApp Bridge is not configured or is disabled in environment variables.' 
        },
        { status: 200 }
      );
    }

    const statusUrl = bridgeUrl('/api/status');
    if (!statusUrl) {
      return NextResponse.json({ error: 'Bridge URL not configured' }, { status: 404 });
    }

    const bridgeRes = await fetch(statusUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      // Dynamic timeout to avoid hanging the serverless function
      signal: AbortSignal.timeout(5000)
    }).catch(err => {
      console.error('[Bridge Status Proxy] Fetch failed:', err.message);
      return null;
    });

    if (!bridgeRes) {
      return NextResponse.json(
        { error: 'WhatsApp bridge is unreachable', status: 'unreachable' },
        { status: 503 }
      );
    }

    const text = await bridgeRes.text();
    let payload: any = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    if (!bridgeRes.ok) {
      return NextResponse.json(
        {
          error: 'WhatsApp bridge status failed',
          details: payload?.error || `Bridge returned ${bridgeRes.status}`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (e) {
    console.error('[Bridge Status Proxy] Internal error:', e);
    return NextResponse.json(
      {
        error: 'Failed to fetch WhatsApp bridge status',
        details: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
